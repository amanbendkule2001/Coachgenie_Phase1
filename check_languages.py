import asyncio
import edge_tts
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

async def check_voices():
    voices = await edge_tts.list_voices()
    targets = ['hi-IN', 'mr-IN', 'en-IN', 'en-US']
    for v in voices:
        if any(t in v['Locale'] for t in targets):
            print(f"{v['ShortName']} | {v['Gender']} | {v['Locale']}")

if __name__ == "__main__":
    asyncio.run(check_voices())
