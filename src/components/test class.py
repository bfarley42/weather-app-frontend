import os, json

BRAIN = "chat_memory.json"

if os.path.exists(BRAIN):
    with open(BRAIN, 'r', encoding='utf-8') as f:
        brain=json.load(f)
else:
    brain = {}

print("Memories Loaded", len(brain))
print("hey, teach me how to talk.  type quit to exit")

while True:
    user=input("You:").strip().lower()
    if user.lower()=="quit":
        break

    if user in brain:
        print("Bot:", brain[user])
        continue

    print("Bot: I don't know what to say")
    teach = input("Can you teach me?")

    brain[user] = teach
    print("Bot: Got it! I'll remember that")
