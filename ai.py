import telebot
import requests

# Replace with your actual bot token
BOT_TOKEN = '7653249811:AAFDEHUsvSZLm5IqNhSuijpLCBconUwGgfs'

bot = telebot.TeleBot(BOT_TOKEN)

# /start command handler
@bot.message_handler(commands=['start'])
def start_msg(message):
    bot.send_message(
        message.chat.id,
        "👋 Welcome to *Arslan-MD Session Bot!*\n\n"
        "📱 Please send your WhatsApp number with country code (e.g., `923001234567`).\n\n"
        "_Do not include the plus (+) sign._",
        parse_mode="Markdown"
    )

# Message handler for numeric phone numbers
@bot.message_handler(func=lambda m: m.text.isdigit())
def handle_number(message):
    phone = message.text.strip()

    bot.send_message(message.chat.id, f"🔄 Creating pairing code for `{phone}`...", parse_mode="Markdown")

    try:
        response = requests.post("https://tcroneb-xmd-plus.onrender.com/pair", json={"number": phone}, timeout=15)
        if response.status_code == 200:
            data = response.json()
            code = data.get("code")
            if code:
                bot.send_message(
                    message.chat.id,
                    f"✅ *Pairing code:* `{code}`\n\n"
                    "📲 Open *WhatsApp* > *Linked Devices* > *Link a New Device* and scan the QR.",
                    parse_mode="Markdown"
                )
            else:
                bot.send_message(message.chat.id, "⚠️ No code returned. Please try again.")
        else:
            bot.send_message(message.chat.id, f"❌ Failed to generate pairing code. Server responded with status {response.status_code}.")
    except requests.exceptions.RequestException as e:
        bot.send_message(message.chat.id, f"❌ Request error: {e}")

# Start polling
bot.infinity_polling()
