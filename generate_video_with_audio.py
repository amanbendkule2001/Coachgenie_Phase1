import os
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import json
import asyncio
import subprocess
import edge_tts
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

# Narration script per scene
SCENES = [
    {
        "id": "scene_01_login",
        "title": "🔐 Step 1: Secure Institute Authentication",
        "url": "http://localhost:3000/login",
        "text": "Welcome to CoachGenie, the all-in-one coaching institute management ERP. We begin with secure institute authentication, entering our institute code 'demo' and signing in with administrative credentials."
    },
    {
        "id": "scene_02_dashboard",
        "title": "📊 Step 2: Executive Dashboard & Live Metrics",
        "url": "http://localhost:3000/dashboard",
        "text": "Welcome to the Executive Dashboard. Here, institute leaders get a real-time overview of key metrics, including active students, inquiry funnels, batch counts, and monthly revenue, supported by live interactive charts and attendance heatmaps."
    },
    {
        "id": "scene_03_leads",
        "title": "🎯 Step 3: Leads & Student Inquiry Pipeline",
        "url": "http://localhost:3000/leads",
        "text": "In the Leads and CRM module, coaching centers can track incoming student inquiries, manage follow-ups, qualify prospective students, and streamline conversion workflows seamlessly."
    },
    {
        "id": "scene_04_admissions",
        "title": "📝 Step 4: Enrolments & Admission Processing",
        "url": "http://localhost:3000/admissions",
        "text": "Once leads are qualified, the Admissions module manages student onboarding, application reviews, document verification, and enrolment status updates with full audit trails."
    },
    {
        "id": "scene_05_students",
        "title": "🎓 Step 5: Student Directory & Comprehensive Profiles",
        "url": "http://localhost:3000/students",
        "text": "The Students Directory maintains unified student profiles, containing academic records, contact info, batch assignments, and individualized growth progress in one centralized place."
    },
    {
        "id": "scene_06_batches",
        "title": "📅 Step 6: Batches, Timetables & Class Scheduling",
        "url": "http://localhost:3000/batches",
        "text": "In the Batches and Scheduling module, administrators can organize course batches, allocate expert faculty, and configure weekly session timetables effortlessly."
    },
    {
        "id": "scene_07_attendance",
        "title": "📋 Step 7: Real-Time Attendance Management",
        "url": "http://localhost:3000/attendance",
        "text": "Daily operations are simplified through the Attendance module, allowing real-time student check-ins, automated absentee tracking, and monthly attendance logs."
    },
    {
        "id": "scene_08_exams",
        "title": "🏆 Step 8: Exams, Assessments & AI Growth Cards",
        "url": "http://localhost:3000/exams",
        "text": "The Exams and Assessments module tracks test schedules, calculates scorecards, and leverages AI intelligence to generate personalized performance growth trajectories for every student."
    },
    {
        "id": "scene_09_fees",
        "title": "💳 Step 9: Fee Collections, Invoicing & Financial Records",
        "url": "http://localhost:3000/fees",
        "text": "The Fees and Billing engine handles structured fee plans, tracks upcoming installments, records instant payment receipts, and provides transparent financial revenue analytics."
    },
    {
        "id": "scene_10_ai_analytics",
        "title": "🤖 Step 10: AI Intelligence & Predictive Analytics",
        "url": "http://localhost:3000/ai/analytics",
        "text": "Finally, CoachGenie features advanced AI Analytics to deliver predictive admission conversions, batch health tracking, dropout risk detection, and revenue forecasting."
    },
    {
        "id": "scene_11_outro",
        "title": "✨ CoachGenie ERP: Complete All-in-One Coaching System",
        "url": "http://localhost:3000/dashboard",
        "text": "CoachGenie: empowering modern coaching institutes with intelligent, seamless management. Thank you for watching."
    }
]

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio_tracks")
os.makedirs(AUDIO_DIR, exist_ok=True)

def get_audio_duration(file_path):
    cmd = [
        FFMPEG_EXE, "-i", file_path,
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            time_str = line.split("Duration:")[1].split(",")[0].strip()
            parts = time_str.split(":")
            h, m, s = float(parts[0]), float(parts[1]), float(parts[2])
            return h * 3600 + m * 60 + s
    return 8.0

async def generate_narration():
    print("[1/3] Generating studio-quality AI voiceover narration using Edge-TTS (JennyNeural)...")
    scene_durations = {}
    
    for i, scene in enumerate(SCENES):
        out_file = os.path.join(AUDIO_DIR, f"{scene['id']}.mp3")
        communicate = edge_tts.Communicate(scene["text"], "en-US-JennyNeural", rate="+3%", pitch="+0Hz")
        await communicate.save(out_file)
        dur = get_audio_duration(out_file)
        scene["audio_file"] = out_file
        scene["duration"] = dur + 1.2 # Add small buffer for transition
        scene_durations[scene["id"]] = scene["duration"]
        print(f"  [+] {scene['id']}: {dur:.2f}s narration -> allocated {scene['duration']:.2f}s")
    
    # Create master audio concat list
    concat_list_file = os.path.join(AUDIO_DIR, "concat_list.txt")
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for scene in SCENES:
            f.write(f"file '{os.path.abspath(scene['audio_file']).replace(chr(92), '/')}'\n")
    
    master_audio = os.path.join(AUDIO_DIR, "master_narration.mp3")
    cmd = [
        FFMPEG_EXE, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list_file,
        "-c", "copy",
        master_audio
    ]
    subprocess.run(cmd, check=True)
    total_audio_dur = get_audio_duration(master_audio)
    print(f"[+] Master audio track created: {master_audio} ({total_audio_dur:.2f}s)")
    
    timing_file = os.path.join(os.path.dirname(__file__), "scene_timings.json")
    with open(timing_file, "w", encoding="utf-8") as f:
        json.dump(SCENES, f, indent=2)
    print(f"[+] Timings saved to {timing_file}")
    return master_audio, total_audio_dur

def record_video_with_timings():
    print("[2/3] Running Playwright to record video synchronized with audio timings...")
    node_cmd = ["node", "record_timed_video.js"]
    subprocess.run(node_cmd, check=True)
    print("[+] Raw timed video recording completed.")

def merge_video_and_audio(master_audio):
    raw_video = os.path.join(os.path.dirname(__file__), "CoachGenie_Application_Walkthrough_Raw.webm")
    output_mp4 = os.path.join(os.path.dirname(__file__), "CoachGenie_Application_Walkthrough_With_Audio.mp4")
    output_webm = os.path.join(os.path.dirname(__file__), "CoachGenie_Application_Walkthrough_With_Audio.webm")
    
    print(f"[3/3] Merging video ({raw_video}) and audio ({master_audio}) into MP4 & WebM...")
    
    # Output MP4 (H.264 + AAC)
    cmd_mp4 = [
        FFMPEG_EXE, "-y",
        "-i", raw_video,
        "-i", master_audio,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_mp4
    ]
    subprocess.run(cmd_mp4, check=True)
    print(f"[+] Successfully created MP4: {output_mp4}")

    # Output WebM (VP9/VP8 + Opus)
    cmd_webm = [
        FFMPEG_EXE, "-y",
        "-i", raw_video,
        "-i", master_audio,
        "-c:v", "copy",
        "-c:a", "libopus",
        "-b:a", "128k",
        "-shortest",
        output_webm
    ]
    subprocess.run(cmd_webm, check=True)
    print(f"[+] Successfully created WebM: {output_webm}")

async def main():
    master_audio, _ = await generate_narration()
    record_video_with_timings()
    merge_video_and_audio(master_audio)
    print("\nSUCCESS! Full application video with studio-grade audio narration is ready!")

if __name__ == "__main__":
    asyncio.run(main())
