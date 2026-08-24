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
OUTPUT_DIR = os.path.dirname(__file__)

# -------------------------------------------------------------
# 18 DETAILED SCENES DEFINITION IN 3 LANGUAGES
# -------------------------------------------------------------

MODULES_DATA = [
    {
        "id": "scene_01_login",
        "url": "http://localhost:3000/login",
        "titles": {
            "en": "🔐 Step 1: Secure Multi-Tenant Authentication",
            "hi": "🔐 चरण 1: सुरक्षित कोचिंग संस्थान लॉगिन",
            "mr": "🔐 टप्पा 1: सुरक्षित कोचिंग संस्था लॉगिन"
        },
        "scripts": {
            "en": "Welcome to CoachGenie, the all-in-one Enterprise Coaching Management System. We begin with secure multi-tenant authentication. Simply enter your unique institute code 'demo', administrative email, and password to securely log into your dedicated portal.",
            "hi": "कोचजीनी में आपका स्वागत है, जो आधुनिक कोचिंग संस्थानों के लिए एक संपूर्ण प्रबंधन ईआरपी प्रणाली है। शुरुआत सुरक्षित संस्थान प्रमाणीकरण से होती है। यहां अपना संस्थान कोड 'demo', एडमिन ईमेल और पासवर्ड दर्ज करके अपने संस्थान के मुख्य पोर्टल में सुरक्षित रूप से प्रवेश करते हैं।",
            "mr": "कोचजिनी मध्ये आपले मनःपूर्वक स्वागत आहे. हे आधुनिक कोचिंग क्लासेससाठी एक संपूर्ण आणि प्रगत व्यवस्थापन ईआरपी पोर्टल आहे. लॉगिन करण्यासाठी आपला संस्था कोड 'demo', प्रशासकीय ईमेल आणि पासवर्ड टाकून सुरक्षितपणे आपल्या डॅशबोर्डवर प्रवेश करू शकता."
        }
    },
    {
        "id": "scene_02_dashboard",
        "url": "http://localhost:3000/dashboard",
        "titles": {
            "en": "📊 Step 2: Executive Overview Dashboard",
            "hi": "📊 चरण 2: मुख्य कार्यकारी डैशबोर्ड और लाइव मेट्रिक्स",
            "mr": "📊 टप्पा 2: मुख्य कार्यकारी डॅशबोर्ड व थेट माहिती"
        },
        "scripts": {
            "en": "This is the Executive Dashboard. Institute directors and branch managers get a high-level operational overview in real-time, showcasing active students, lead conversion funnels, running batches, monthly revenue statistics, dynamic fee collection charts, and classroom attendance heatmaps.",
            "hi": "यह संस्थान का मुख्य कार्यकारी डैशबोर्ड है। यहां निदेशक और प्रबंधक सभी महत्वपूर्ण आंकड़े एक साथ देख सकते हैं, जैसे कुल सक्रिय छात्र, नई पूछताछ और लीड्स, चालू बैच, मासिक शुल्क संग्रह चार्ट और दैनिक उपस्थिति हीटमैप्स।",
            "mr": "हा संस्थेचा मुख्य डॅशबोर्ड आहे. येथे संचालक आणि व्यवस्थापकांना सर्व महत्त्वाची माहिती एकाच ठिकाणी मिळते, जसे की सक्रिय विद्यार्थी संख्या, चालू बॅचेस, या महिन्यातील फी संकलन आलेख आणि दैनंदिन हजेरी हीटमॅप्स."
        }
    },
    {
        "id": "scene_03_leads",
        "url": "http://localhost:3000/leads",
        "titles": {
            "en": "🎯 Step 3: Leads CRM & Inquiry Pipeline",
            "hi": "🎯 चरण 3: लीड्स और छात्र पूछताछ प्रबंधन",
            "mr": "🎯 टप्पा 3: चौकशी व लीड्स व्यवस्थापन"
        },
        "scripts": {
            "en": "In the Leads and CRM module, coaching centers can track incoming student inquiries across multiple channels, manage counselor follow-ups, organize leads by pipeline status, filter by source, and convert prospective candidates into confirmed enrolments with one click.",
            "hi": "लीड्स और सीआरएम मॉड्यूल में, आप नए छात्र पूछताछ का रिकॉर्ड रख सकते हैं। इसमें लीड्स की वर्तमान स्थिति, फॉलो-अप रिमाइंडर, स्रोतों के अनुसार फ़िल्टरिंग, और संभावित छात्रों को सीधे प्रवेश में बदलने की पूरी सुविधा उपलब्ध है।",
            "mr": "लीड्स आणि सीआरएम विभागात नवीन विद्यार्थ्यांच्या चौकशींची नोंद ठेवली जाते. फॉलो-अप रिमाइंडर, लीड्सची सद्यस्थिती, चौकशीचे स्रोत आणि चौकशींचे थेट प्रवेशामध्ये रूपांतर करण्याची सुविधा येथे उपलब्ध आहे."
        }
    },
    {
        "id": "scene_04_admissions",
        "url": "http://localhost:3000/admissions",
        "titles": {
            "en": "📝 Step 4: Admissions & Enrolment Processing",
            "hi": "📝 चरण 4: प्रवेश और दस्तावेज़ सत्यापन",
            "mr": "📝 टप्पा 4: प्रवेश प्रक्रिया व कागदपत्रे पडताळणी"
        },
        "scripts": {
            "en": "The Admissions module streamlines student onboarding. Staff can process new admission applications, verify student identity documents, assign roll numbers, allocate courses, and track the entire admission approval workflow transparently.",
            "hi": "प्रवेश प्रबंधन मॉड्यूल छात्रों के दाखिले की प्रक्रिया को पूरी तरह व्यवस्थित करता है। यहां नए आवेदनों की समीक्षा, पहचान दस्तावेजों का सत्यापन, रोल नंबर आवंटन, और प्रवेश स्वीकृति की पूरी स्थिति आसानी से देखी जा सकती है।",
            "mr": "प्रवेश व्यवस्थापन विभागात नवीन विद्यार्थ्यांच्या दाखल्यांची प्रक्रिया पार पाडली जाते. अर्जांची तपासणी, ओळखपत्रांची पडताळणी, रोल नंबर वाटप आणि प्रवेश मंजुरीची स्थिती येथे व्यवस्थितपणे नियंत्रित केली जाते."
        }
    },
    {
        "id": "scene_05_students",
        "url": "http://localhost:3000/students",
        "titles": {
            "en": "🎓 Step 5: Student Directory & 360° Profiles",
            "hi": "🎓 चरण 5: छात्र डायरेक्टरी और 360-डिग्री प्रोफ़ाइल",
            "mr": "🎓 टप्पा 5: विद्यार्थी निर्देशिका व सर्वसमावेशक माहिती"
        },
        "scripts": {
            "en": "The Students Directory maintains a 360-degree digital record of every enrolled student. It includes parent contact details, active batch enrollments, attendance history, past examination scores, fee installment status, and growth analytics.",
            "hi": "छात्र डायरेक्टरी में संस्थान के सभी नामांकित छात्रों का 360-डिग्री डिजिटल रिकॉर्ड सुरक्षित रहता है। इसमें माता-पिता की संपर्क जानकारी, नामांकित बैच, उपस्थिति इतिहास, परीक्षा परिणाम और व्यक्तिगत प्रगति का पूरा विवरण शामिल है।",
            "mr": "विद्यार्थी निर्देशिकेत सर्व प्रवेशित विद्यार्थ्यांची संपूर्ण डिजिटल माहिती असते. यात पालकांचे संपर्क तपशील, बॅच तपशील, हजेरीचा इतिहास, परीक्षांमधील गुण आणि प्रगती अहवाल उपलब्ध असतो."
        }
    },
    {
        "id": "scene_06_batches",
        "url": "http://localhost:3000/batches",
        "titles": {
            "en": "📅 Step 6: Batches & Course Management",
            "hi": "📅 चरण 6: बैच और पाठ्यक्रम प्रबंधन",
            "mr": "📅 टप्पा 6: बॅचेस आणि अभ्यासक्रम व्यवस्थापन"
        },
        "scripts": {
            "en": "The Batches module allows administrators to configure academic batches, set maximum student capacities, assign expert faculty and subject mentors, define syllabus tracks, and manage student batch transitions effortlessly.",
            "hi": "बैच प्रबंधन मॉड्यूल में आप नए शैक्षणिक बैच बना सकते हैं, प्रत्येक बैच की छात्र क्षमता निर्धारित कर सकते हैं, विषयवार शिक्षकों और मेंटर्स को नियुक्त कर सकते हैं, और पाठ्यक्रम की प्रगति को ट्रैक कर सकते हैं।",
            "mr": "बॅच व्यवस्थापन विभागात नवीन बॅचेस तयार करणे, विद्यार्थ्यांची क्षमता ठरवणे, तज्ज्ञ शिक्षकांची नियुक्ती करणे आणि अभ्यासक्रमाच्या प्रगतीचे नियोजन करणे अतिशय सोपे होते."
        }
    },
    {
        "id": "scene_07_sessions",
        "url": "http://localhost:3000/sessions",
        "titles": {
            "en": "⏰ Step 7: Class Sessions & Lecture Scheduling",
            "hi": "⏰ चरण 7: कक्षा सत्र और समय सारिणी",
            "mr": "⏰ टप्पा 7: वर्ग सत्रे आणि तासिकांचे वेळापत्रक"
        },
        "scripts": {
            "en": "Under Sessions and Timetables, institutes can plan daily and weekly lecture calendars, schedule recurring classroom or online sessions, avoid faculty timing conflicts, and notify students about upcoming classes.",
            "hi": "सत्र और समय सारिणी मॉड्यूल में, संस्थान दैनिक और साप्ताहिक व्याख्यानों का कैलेंडर तैयार कर सकते हैं, नियमित क्लासरूम या ऑनलाइन सत्रों का समय निर्धारित कर सकते हैं, और छात्रों को आगामी कक्षाओं की सूचना दे सकते हैं।",
            "mr": "तासिका व वेळापत्रक विभागात दैनंदिन आणि साप्ताहिक वर्गांचे नियोजन केले जाते, जेणेकरून शिक्षकांच्या वेळेत कोणताही गोंधळ होणार नाही आणि विद्यार्थ्यांना वेळेवर सूचना मिळतील."
        }
    },
    {
        "id": "scene_08_attendance",
        "url": "http://localhost:3000/attendance",
        "titles": {
            "en": "📋 Step 8: Daily Live Attendance",
            "hi": "📋 चरण 8: दैनिक लाइव उपस्थिति प्रबंधन",
            "mr": "📋 टप्पा 8: दैनंदिन थेट हजेरी नोंदणी"
        },
        "scripts": {
            "en": "The Attendance module facilitates fast and accurate daily student check-ins. Faculty can quickly mark Present, Absent, or Late with a single click, triggering instant automated SMS and WhatsApp alerts to parents.",
            "hi": "दैनिक उपस्थिति मॉड्यूल से कक्षाओं में छात्रों की हाजिरी तुरंत और सटीक तरीके से दर्ज की जाती है। शिक्षक एक क्लिक में उपस्थित या अनुपस्थित दर्ज कर सकते हैं, जिससे अनुपस्थित छात्रों के अभिभावकों को तुरंत सूचना भेजी जा सकती है।",
            "mr": "दैनंदिन हजेरी विभागात विद्यार्थ्यांची हजेरी एका क्लिकवर घेतली जाते. शिक्षक हजर किंवा गैरहजर नोंदवू शकतात आणि गैरहजर विद्यार्थ्यांच्या पालकांना त्वरित संदेश पाठवला जातो."
        }
    },
    {
        "id": "scene_09_attendance_reports",
        "url": "http://localhost:3000/attendance/reports",
        "titles": {
            "en": "📈 Step 9: Attendance Reports & Analytics",
            "hi": "📈 चरण 9: उपस्थिति रिपोर्ट और विस्तृत विश्लेषण",
            "mr": "📈 टप्पा 9: हजेरी अहवाल व सांख्यिकी"
        },
        "scripts": {
            "en": "In Attendance Reports, coaching management can inspect monthly attendance percentages, detect chronic absenteeism patterns, export printable attendance registers, and monitor classroom engagement trends.",
            "hi": "उपस्थिति रिपोर्ट में, प्रबंधन मासिक उपस्थिति प्रतिशत देख सकता है, लगातार गैरहाजिर रहने वाले छात्रों की पहचान कर सकता है, और आधिकारिक उपस्थिति रजिस्टर डाउनलोड व प्रिंट कर सकता है।",
            "mr": "हजेरी अहवाल विभागात संपूर्ण महिन्याची हजेरी टक्केवारी, गैरहजेरीचे विश्लेषण आणि अधिकृत हजेरी पत्रके डाऊनलोड व प्रिंट करण्याची सुविधा मिळते."
        }
    },
    {
        "id": "scene_10_exams",
        "url": "http://localhost:3000/exams",
        "titles": {
            "en": "🏆 Step 10: Exams, Tests & Scorecard Management",
            "hi": "🏆 चरण 10: परीक्षा, टेस्ट सीरीज़ और अंक तालिका",
            "mr": "🏆 टप्पा 10: परीक्षा, चाचण्या व गुणपत्रिका व्यवस्थापन"
        },
        "scripts": {
            "en": "The Exams module manages chapter tests, weekly assessments, and mock entrance exams. Teachers can schedule test dates, record subject-wise marks, generate automated rank lists, and deliver downloadable report cards to parents.",
            "hi": "परीक्षा मॉड्यूल में साप्ताहिक टेस्ट, यूनिट परीक्षा और मॉक टेस्ट का पूरा प्रबंधन होता है। शिक्षक विषयवार अंक दर्ज कर सकते हैं, मेरिट व रैंक लिस्ट निकाल सकते हैं, और छात्रों के लिए डिजिटल प्रगति पत्रक तैयार कर सकते हैं।",
            "mr": "परीक्षा विभागात साप्ताहिक चाचण्या आणि सराव परीक्षांचे नियोजन केले जाते. शिक्षक विषयवार गुण नोंदवून थेट गुणवत्ता यादी व प्रगती पत्रके तयार करू शकतात."
        }
    },
    {
        "id": "scene_11_growth_cards",
        "url": "http://localhost:3000/growth-cards",
        "titles": {
            "en": "✨ Step 11: AI Student Growth Cards",
            "hi": "✨ चरण 11: एआई छात्र ग्रोथ कार्ड्स और प्रदर्शन विश्लेषण",
            "mr": "✨ टप्पा 11: एआई विद्यार्थी प्रगती कार्ड्स"
        },
        "scripts": {
            "en": "AI Growth Cards leverage machine learning to analyze every student's assessment trajectory over time, highlighting strong topics, areas needing remedial attention, and predicting final exam readiness.",
            "hi": "एआई ग्रोथ कार्ड्स आधुनिक तकनीक द्वारा प्रत्येक छात्र के शैक्षणिक प्रदर्शन का विश्लेषण करते हैं, जिससे उनके मजबूत और कमजोर विषयों की सटीक पहचान होती है और व्यक्तिगत मार्गदर्शन संभव होता है।",
            "mr": "एआय ग्रोथ कार्ड्सद्वारे प्रत्येक विद्यार्थ्याच्या शैक्षणिक प्रगतीचे अचूक विश्लेषण केले जाते, ज्यामुळे विद्यार्थ्यांचे पक्के व कच्चे विषय समजून त्यांना योग्य मार्गदर्शन करता येते."
        }
    },
    {
        "id": "scene_12_fees",
        "url": "http://localhost:3000/fees",
        "titles": {
            "en": "💳 Step 12: Fees Management & Invoicing",
            "hi": "💳 चरण 12: फीस प्रबंधन और रसीद संग्रह",
            "mr": "💳 टप्पा 12: फी संकलन व पावती व्यवस्थापन"
        },
        "scripts": {
            "en": "The Fees module provides a complete financial ledger for coaching institutes. Administrators can configure flexible fee structures, track upcoming and overdue installments, record cash or online payments, and generate branded GST invoices.",
            "hi": "फीस मॉड्यूल कोचिंग संस्थानों के लिए एक संपूर्ण वित्तीय लेखा-जोखा प्रदान करता है। इसमें किस्तों का प्रबंधन, बकाया फीस की ट्रैकिंग, डिजिटल पेमेंट रिकॉर्ड और आधिकारिक रसीदें जारी करने की पूरी सुविधा है।",
            "mr": "फी व्यवस्थापन विभागात संस्थेचे संपूर्ण आर्थिक व्यवहार सांभाळले जातात. हप्त्यांचे नियोजन, थकीत फीचा मागोवा, ऑनलाइन किंवा रोख फी जमा करणे आणि अधिकृत पावत्या तयार करणे सहज शक्य होते."
        }
    },
    {
        "id": "scene_13_billing",
        "url": "http://localhost:3000/settings/billing",
        "titles": {
            "en": "💼 Step 13: Subscription & Billing Settings",
            "hi": "💼 चरण 13: संस्थान सदस्यता और बिलिंग विवरण",
            "mr": "💼 टप्पा 13: संस्था वर्गणी व बिलिंग तपशील"
        },
        "scripts": {
            "en": "Under Billing and Subscription Settings, institute owners can monitor their software tier, review historical billing invoices, configure payment gateway credentials, and manage license scaling seamlessly.",
            "hi": "बिलिंग सेटिंग्स में संस्थान के स्वामी अपनी सॉफ़्टवेयर योजना, पिछले बिलों के इनवॉइस, पेमेंट गेटवे कॉन्फ़िगरेशन और लाइसेंस का विवरण देख व प्रबंधित कर सकते हैं।",
            "mr": "बिलिंग विभागात संस्थाचालक आपल्या सॉफ्टवेअरचे सबस्क्रिप्शन प्लॅन, मागील बिले, पेमेंट गेटवे जोडणी आणि परवाना व्यवस्थापन पाहू शकतात."
        }
    },
    {
        "id": "scene_14_notifications",
        "url": "http://localhost:3000/notifications",
        "titles": {
            "en": "🔔 Step 14: Broadcasts & Notification Center",
            "hi": "🔔 चरण 14: प्रसारण और सूचना केंद्र",
            "mr": "🔔 टप्पा 14: सूचना व संदेश केंद्र"
        },
        "scripts": {
            "en": "The Notifications Center allows administrators to broadcast critical announcements, emergency holiday alerts, exam schedules, and fee reminders across SMS, Email, and in-app feeds to students, parents, and staff.",
            "hi": "सूचना केंद्र के माध्यम से प्रबंधन सभी महत्वपूर्ण घोषणाएं, परीक्षा कार्यक्रम, छुट्टियों की जानकारी और फीस रिमाइंडर एक साथ छात्रों, अभिभावकों और शिक्षकों तक पहुंचा सकता है।",
            "mr": "सूचना केंद्राद्वारे संस्थेच्या सर्व महत्त्वाच्या घोषणा, सुट्ट्यांचे संदेश, परीक्षांचे वेळापत्रक आणि फी रिमाइंडर सर्व विद्यार्थी, पालक आणि शिक्षकांना एकाच वेळी पाठवले जाऊ शकतात."
        }
    },
    {
        "id": "scene_15_ai_analytics",
        "url": "http://localhost:3000/ai/analytics",
        "titles": {
            "en": "🤖 Step 15: AI Intelligence & Predictive Analytics",
            "hi": "🤖 चरण 15: एआई प्रेडिक्टिव एनालिटिक्स और बिज़नेस इंटेलिजेंस",
            "mr": "🤖 टप्पा 15: एआय प्रेडिक्टिव्ह अ‍ॅनालिटिक्स व प्रगत विश्लेषण"
        },
        "scripts": {
            "en": "CoachGenie's AI Analytics delivers next-generation intelligence: predicting admission conversion likelihood, calculating batch health scores, detecting early dropout risks, and providing actionable revenue forecasts.",
            "hi": "कोचजीनी का एआई एनालिटिक्स मॉड्यूल भविष्यसूचक विश्लेषण प्रदान करता है, जिसमें संभावित प्रवेश दर का पूर्वानुमान, बैच स्वास्थ्य स्कोर, छात्रों के ड्रॉपआउट का प्रारंभिक जोखिम, और राजस्व अनुमान शामिल हैं।",
            "mr": "कोचजिनीचे एआय अ‍ॅनालिटिक्स भविष्यवेधी विश्लेषण देते, ज्यामध्ये नवीन प्रवेशांचा अंदाज, बॅचची गुणवत्ता, संभाव्य गळतीचा धोका आणि आर्थिक उत्पन्नाचा अंदाज यांचा समावेश आहे."
        }
    },
    {
        "id": "scene_16_settings",
        "url": "http://localhost:3000/settings/users",
        "titles": {
            "en": "⚙️ Step 16: Staff Management & Role Permissions",
            "hi": "⚙️ चरण 16: कर्मचारी प्रबंधन और सुरक्षा अधिकार",
            "mr": "⚙️ टप्पा 16: कर्मचारी व्यवस्थापन व सुरक्षा अधिकार"
        },
        "scripts": {
            "en": "In Settings and User Management, institute directors can onboard staff members, assign granular role permissions for Admins, Counselors, Tutors, and Coaches, and customize institute branding.",
            "hi": "सेटिंग्स और उपयोगकर्ता प्रबंधन में, आप नए कर्मचारियों को जोड़ सकते हैं, एडमिन, काउंसलर, शिक्षक और कोच के लिए विशिष्ट अनुमतियां निर्धारित कर सकते हैं, और संस्थान की ब्रांडिंग अनुकूलित कर सकते हैं।",
            "mr": "सेटिंग्ज आणि कर्मचारी व्यवस्थापनात नवीन कर्मचाऱ्यांची नोंदणी, विविध पदांनुसार कामाचे अधिकार वाटप आणि संस्थेचे ब्रँडिंग निश्चित केले जाते."
        }
    },
    {
        "id": "scene_17_docs",
        "url": "http://localhost:3000/docs",
        "titles": {
            "en": "📖 Step 17: In-App Documentation & Guides",
            "hi": "📖 चरण 17: इन-ऐप दस्तावेज़ीकरण और उपयोगकर्ता गाइड",
            "mr": "📖 टप्पा 17: अंतर्गत मार्गदर्शिका व नियमावली"
        },
        "scripts": {
            "en": "The Documentation module contains step-by-step operating guidelines, standard operating procedures, and feature tutorials, helping institute personnel master the software with zero learning curve.",
            "hi": "दस्तावेज़ीकरण मॉड्यूल में संस्थान के कर्मचारियों के लिए चरण-दर-चरण मार्गदर्शिका और मानक संचालन प्रक्रियाएं उपलब्ध हैं, जिससे सॉफ़्टवेयर का उपयोग बेहद आसान हो जाता है।",
            "mr": "मार्गदर्शिका विभागात कर्मचाऱ्यांसाठी सविस्तर वापर माहिती आणि नियमावली उपलब्ध आहे, ज्यामुळे कोणतीही अडचण न येता प्रणाली सहजपणे वापरता येते."
        }
    },
    {
        "id": "scene_18_outro",
        "url": "http://localhost:3000/dashboard",
        "titles": {
            "en": "✨ Step 18: Summary & All-in-One Power of CoachGenie",
            "hi": "✨ चरण 18: निष्कर्ष - कोचजीनी की संपूर्ण शक्ति",
            "mr": "✨ टप्पा 18: निष्कर्ष - कोचजिनीची सर्वसमावेशक ताकद"
        },
        "scripts": {
            "en": "In conclusion, CoachGenie connects every facet of coaching operations: from inquiry to admission, batches to attendance, exams to fees, and AI analytics to growth. Elevate your coaching institute with CoachGenie today. Thank you for watching.",
            "hi": "निष्कर्षतः, कोचजीनी कोचिंग संचालन के हर पहलू को जोड़ता है: पूछताछ से लेकर प्रवेश, बैच, उपस्थिति, परीक्षा, फीस और एआई एनालिटिक्स तक। आज ही अपने संस्थान को कोचजीनी के साथ सशक्त बनाएं। धन्यवाद।",
            "mr": "थोडक्यात सांगायचे तर, कोचजिनी कोचिंग क्लासेसच्या प्रत्येक घटकाला जोडते: चौकशी, प्रवेश, बॅचेस, हजेरी, परीक्षा, फी आणि प्रगत एआय तंत्रज्ञान. आपल्या क्लासला द्या आधुनिक स्वरूप कोचजिनी सोबत. धन्यवाद!"
        }
    }
]

LANGUAGES = [
    {
        "code": "en",
        "name": "English",
        "voice": "en-IN-NeerjaNeural",
        "rate": "+2%",
        "out_name": "CoachGenie_Full_Detailed_Walkthrough_English"
    },
    {
        "code": "hi",
        "name": "Hindi",
        "voice": "hi-IN-SwaraNeural",
        "rate": "+2%",
        "out_name": "CoachGenie_Full_Detailed_Walkthrough_Hindi"
    },
    {
        "code": "mr",
        "name": "Marathi",
        "voice": "mr-IN-AarohiNeural",
        "rate": "+2%",
        "out_name": "CoachGenie_Full_Detailed_Walkthrough_Marathi"
    }
]

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
    return 10.0

async def generate_language_package(lang_cfg):
    lang_code = lang_cfg["code"]
    lang_name = lang_cfg["name"]
    voice = lang_cfg["voice"]
    rate = lang_cfg["rate"]
    
    print(f"\n=======================================================")
    print(f"🎙️ [LANGUAGE: {lang_name.upper()}] Generating Studio Voiceover with {voice}...")
    print(f"=======================================================")
    
    lang_audio_dir = os.path.join(OUTPUT_DIR, f"audio_{lang_code}")
    os.makedirs(lang_audio_dir, exist_ok=True)
    
    scenes_timed = []
    
    for scene in MODULES_DATA:
        s_id = scene["id"]
        title = scene["titles"][lang_code]
        text = scene["scripts"][lang_code]
        url = scene["url"]
        
        audio_file = os.path.join(lang_audio_dir, f"{s_id}.mp3")
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(audio_file)
        dur = get_audio_duration(audio_file)
        
        allocated = dur + 1.2 # Small pause buffer between modules
        scenes_timed.append({
            "id": s_id,
            "url": url,
            "title": title,
            "text": text,
            "audio_file": audio_file,
            "duration": allocated
        })
        print(f"  [+] {s_id}: {dur:.2f}s narration -> {allocated:.2f}s allocated")
        
    concat_txt = os.path.join(lang_audio_dir, "concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for s in scenes_timed:
            f.write(f"file '{os.path.abspath(s['audio_file']).replace(chr(92), '/')}'\n")
            
    master_audio = os.path.join(lang_audio_dir, "master_narration.mp3")
    cmd = [
        FFMPEG_EXE, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        master_audio
    ]
    subprocess.run(cmd, check=True)
    total_dur = get_audio_duration(master_audio)
    print(f"✅ Master {lang_name} Audio Track Created: {master_audio} ({total_dur:.2f}s / ~{total_dur/60:.1f} mins)")
    
    timing_file = os.path.join(OUTPUT_DIR, f"timings_{lang_code}.json")
    with open(timing_file, "w", encoding="utf-8") as f:
        json.dump(scenes_timed, f, indent=2, ensure_ascii=False)
        
    return master_audio, timing_file, total_dur

def record_synchronized_video(timing_file, lang_code):
    print(f"🎬 Recording Video for {lang_code.upper()} using Playwright...")
    node_cmd = ["node", "record_multilingual_video.js", timing_file, lang_code]
    subprocess.run(node_cmd, check=True)
    print(f"✅ Raw Video Recorded for {lang_code.upper()}.")

def merge_and_export(lang_cfg, master_audio, lang_code):
    raw_video = os.path.join(OUTPUT_DIR, f"raw_video_{lang_code}.webm")
    out_base = lang_cfg["out_name"]
    mp4_out = os.path.join(OUTPUT_DIR, f"{out_base}.mp4")
    webm_out = os.path.join(OUTPUT_DIR, f"{out_base}.webm")
    
    print(f"🔄 Muxing {lang_cfg['name']} Video & Audio -> MP4 & WebM...")
    
    # Export MP4 (H.264 + AAC)
    cmd_mp4 = [
        FFMPEG_EXE, "-y",
        "-i", raw_video,
        "-i", master_audio,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "21",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        mp4_out
    ]
    subprocess.run(cmd_mp4, check=True)
    print(f"🎉 Created: {mp4_out}")
    
    # Export WebM (VP8 + Opus)
    cmd_webm = [
        FFMPEG_EXE, "-y",
        "-i", raw_video,
        "-i", master_audio,
        "-c:v", "copy",
        "-c:a", "libopus",
        "-b:a", "128k",
        "-shortest",
        webm_out
    ]
    subprocess.run(cmd_webm, check=True)
    print(f"🎉 Created: {webm_out}")
    
    return mp4_out, webm_out

async def main():
    print("🚀 Starting Multilingual Video Generation for CoachGenie (English, Hindi, Marathi)...")
    results = []
    
    for lang_cfg in LANGUAGES:
        master_audio, timing_file, total_dur = await generate_language_package(lang_cfg)
        record_synchronized_video(timing_file, lang_cfg["code"])
        mp4_out, webm_out = merge_and_export(lang_cfg, master_audio, lang_cfg["code"])
        results.append({
            "lang": lang_cfg["name"],
            "mp4": mp4_out,
            "webm": webm_out,
            "duration": total_dur
        })
        
    print("\n=======================================================")
    print("🎉 ALL MULTILINGUAL VIDEOS SUCCESSFULLY GENERATED!")
    print("=======================================================")
    for r in results:
        print(f"📌 {r['lang']}: {r['duration']:.1f}s (~{r['duration']/60:.1f} mins)")
        print(f"   MP4 : {r['mp4']}")
        print(f"   WebM: {r['webm']}\n")

if __name__ == "__main__":
    asyncio.run(main())
