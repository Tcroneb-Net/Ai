import os
import time
import urllib.request
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from magic_hour import Client

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MAGIC_HOUR_API_KEY = os.getenv("MAGIC_HOUR_API_KEY")
client = Client(token=MAGIC_HOUR_API_KEY)

# -- COMMAND: /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🪄 Generate Image", callback_data="generate")],
        [InlineKeyboardButton("🗝️ Show Free Features", callback_data="features")],
        [InlineKeyboardButton("ℹ️ About", callback_data="about")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    with open("assets/welcome.jpg", "rb") as img:
        await update.message.reply_photo(
            photo=img,
            caption=(
                "**Welcome to MagicBot!** 🧙‍♂️\n\n"
                "Send prompts to generate beautiful AI art using the Magic Hour API.\n"
                "Tap a button below to get started."
            ),
            parse_mode="Markdown",
            reply_markup=reply_markup
        )

# -- CALLBACK BUTTON HANDLER
async def handle_buttons(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "generate":
        await query.message.reply_text("🪄 Please send me a prompt to generate your image.")

    elif query.data == "features":
        try:
            features = client.v1.features.list()
            free_features = [f for f in features if f.get("free", False)]
            if free_features:
                text = "🆓 *Free Features Available:*\n"
                for f in free_features:
                    text += f"- {f['name']}\n"
            else:
                text = "No free features available right now."
        except Exception as e:
            text = f"Failed to fetch features: {e}"
        await query.message.reply_text(text, parse_mode="Markdown")

    elif query.data == "about":
        await query.message.reply_text(
            "🤖 *MagicBot* uses the [Magic Hour](https://magichour.ai) API to create AI art from your text.\n"
            "Built with ❤️ using Python and Telegram.\n\n"
            "_Send a prompt anytime to generate an image!_",
            parse_mode="Markdown"
        )

# -- PROMPT HANDLER
async def handle_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    prompt = update.message.text
    progress_msg = await update.message.reply_text(f"✨ Rendering your image...\nPrompt: `{prompt}`", parse_mode="Markdown")

    create_res = client.v1.ai_image_generator.create(
        image_count=1,
        orientation="landscape",
        style={"prompt": prompt}
    )

    start_time = time.time()
    timeout = 60
    while True:
        res = client.v1.image_projects.get(id=create_res.id)
        if res.status == "complete":
            output_file = "output.jpg"
            with urllib.request.urlopen(res.downloads[0].url) as response, open(output_file, "wb") as out_file:
                out_file.write(response.read())
            await progress_msg.delete()
            await update.message.reply_photo(
                photo=open(output_file, "rb"),
                caption=f"🎨 Here's your AI-generated image for:\n`{prompt}`",
                parse_mode="Markdown"
            )
            break
        elif res.status == "error":
            await progress_msg.edit_text("❌ Render failed. Please try again.")
            break
        elif time.time() - start_time > timeout:
            await progress_msg.edit_text("⏳ Render timed out.")
            break
        else:
            await progress_msg.edit_text(f"✨ Rendering in progress...\nPrompt: `{prompt}`", parse_mode="Markdown")
            time.sleep(3)

# -- SETUP BOT
app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CallbackQueryHandler(handle_buttons))
app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_prompt))

if __name__ == "__main__":
    app.run_polling()
