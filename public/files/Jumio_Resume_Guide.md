# Jumio Research Engineer — Resume Tailoring Guide

Companion to `Resume_Jumio.docx`. Use this to update your Overleaf `Resume.tex`, and to know which lines are fully backed versus which still need a real detail before you send it.

## What I changed and why

- **Added a Summary** that front-loads the exact phrases in the JD: computer vision, generative-AI data pipelines, PyTorch model training/evaluation, database mining, Python/C++, HPC-scale training, reinforcement learning for autonomous control, and cross-functional delivery.
- **Reframed the AFRL bullets** to speak the JD's language: "data-collection pipelines," "end-to-end ML workflows (data prep → training → evaluation → monitoring)," and an explicit link to "computer-vision and identity/biometric data" (Jumio's domain is identity verification). The +50-point gain is stated as fact ("led to"), which you confirmed.
- **Added Geometry Health and Wellness as your lead EXPERIENCE entry** (Founding AI/ML Product Engineer, Sep 2025 – Present). This is the single strongest addition: it's current, and it backs the iOS/Android requirement, the data-pipeline requirement (real-time ETL), LLM/ML deployment, biometric/clinical data collection (Jumio's domain), *and* product leadership — all at once. I condensed your six CUI-resume bullets to four tuned for Jumio (full-stack app, ETL pipeline, LLM+PubMed/streaming, MVP→production leadership).
- **Added an AWS DeepRacer project** — honest and useful: covers the AWS nice-to-have and gives you a real reinforcement-learning + autonomous-control bullet.
- **Reframed the Phonebook project** to emphasize the relational backend, queries, and CRUD/data pipeline.
- **Expanded Technical Skills** into JD-aligned groups. Added scikit-learn, model evaluation & monitoring, AWS, and iOS/Android.

## Geometry Health — expanded, Jumio-tuned bullet bank

Full-length on purpose — condense when you port into Jake's format. The framing is deliberate: Jumio's Research Engineer builds in-house iOS data-collection apps, turns collected data into training/eval datasets, mines internal databases for features, runs end-to-end ML workflows, and monitors model performance in production. **You have already shipped every one of those things.** Each bullet below leads with the capability and closes on why it matters.

> These are now grounded in your actual `GHW_MVP` and `GeometryNeuroScience` codebases — real numbers, real methods. Sensor/fall metrics are labeled honestly ("validated vs. reference," "in simulation") because your own `RESULTS.md` is careful about it, and a recruiter who opens the repo should find the resume matches.

1. **Founding engineer of a full-stack, HIPAA-conscious stroke-recovery platform** (Swift/SwiftUI, iOS 17 + Python/Flask) that puts clinical-grade motion analysis and AI guidance directly in the hands of stroke survivors and their care teams — turning recovery blind spots into daily, data-driven care and proving I can carry applied AI from research prototype to a system real people use.

2. **Ported clinically validated mobility assessments from MATLAB research prototypes to a production iOS app**, matching the reference pipeline within **0.56%** on the 15-biomarker Postural Sway test and reproducing 10-Meter Walk gait speed **exactly** — the literal skill Jumio asks for: *"translate research or prototype work into scalable engineering solutions."*

3. **Built the on-device biomarker signal-processing pipeline** in Swift: 100 Hz CoreMotion capture → gravity removal → 4th-order zero-phase Butterworth band-pass (0.1–3 Hz) → double integration → PCA → 15 sway biomarkers with automated quality flags, plus a live causal step-detection state machine (EMA smoothing, peak counting, auto-stop at 10 m) for gait. *(Real DSP/feature-engineering on sensor data — adjacent to CV feature extraction.)*

4. **Built the in-house iOS data-collection app** that captures clinically grounded biomarkers on-device — CoreMotion motion/gait, task/survey/check-in responses, and fall/emergency events — and exports every trial as timestamped JSON, producing the longitudinal, labeled datasets that models are validated against. *(Exactly Jumio's "build and maintain training and test datasets collected through in-house iOS applications.")*

5. **Prototyped and evaluated a fall/posture-detection algorithm** with a Monte-Carlo simulation harness (300 trials/cell over synthesized 100 Hz IMU traces): the freefall-plus-impact detector caught **98.5% of falls with 0% false alarms in simulation**, and the analysis honestly characterized where phone placement makes sit-vs-stand separable — rigorous, evidence-first engineering before touching production. *(Maps to hands-on debugging of system behavior and evidence-based decisions.)*

6. **Implemented the end-to-end ML/LLM workflow** behind a context-aware clinical assistant — data prep, retrieval of the patient's recent biomarkers, distilled symptom history and top PubMed abstracts, prompt construction, and geo-routed deployment across a self-hosted Ollama **DeepSeek-V2 16B** model and cloud providers — delivering evidence-based guidance with real research citations instead of hallucinations. *(Maps to "end-to-end ML workflows including data prep, training, evaluation, and deployment support.")*

7. **Engineered the real-time backend** (Flask REST + WebSocket, SQLite): message routing, urgency/emergency detection, adherence reporting, and streaming inference sustaining **sub-second (<1s) latency for 16B-parameter model responses** — production performance where a survivor's urgent question can't wait. *(Data pipelines + production model performance + monitoring.)*

8. **Integrated PubMed/NCBI research retrieval** (Entrez/biopython) with symptom distillation so every recommendation is grounded in current peer-reviewed evidence — turning a firehose of abstracts into one actionable, cited answer at the bedside.

9. **Led the product from MVP to production as founding engineer** — owning technical-architecture decisions, sprint cycles, and coordination across clinicians, engineering, and product — demonstrating I don't just prototype models, I ship and maintain the systems that carry them. *(Maps to "collaborate cross-functionally with ML, engineering, product, and research teams.")*

**Why this makes you the top candidate (the pitch):** Jumio wants someone who can stand up the in-house iOS data-collection app, turn that data into validated datasets, mine it for features, run ML end-to-end, and monitor it in production — and who can take a researcher's MATLAB prototype and turn it into scalable, shipped code. Most early-career applicants have done *one* of those in a class. You have done *all* of them, verifiably, on a real product where the output matters to someone's recovery — and you did it with the intellectual honesty (validation within 0.56%, simulation caveats spelled out) that clinical/biometric AI actually demands. ROS is the only new piece; every hard part is already behind you.

## Keyword coverage vs. the job description

| JD requirement | Covered? | Where |
|---|---|---|
| ML fundamentals + PyTorch | Strong | AFRL, REU, Skills |
| Python + C++ | Python strong; C++ = coursework | Skills, coursework line |
| Computer vision | Strong | AFRL GAN/CNN work |
| Databases, queries, data pipelines | **Strong now** | Geometry Health ETL pipeline, NSF ransomware, Phonebook |
| Model evaluation / production monitoring | Good | AFRL eval vs. baselines + Geometry production streaming |
| Cross-functional collaboration | Good | Geometry "MVP→production, team coordination" |
| Cloud (AWS S3/EC2/SageMaker) | Light | DeepRacer + Skills (see flags) |
| CV / biometric / identity data collection | **Strong now** | Geometry clinical biomarkers + AFRL imaging |
| iOS/Android data-collection apps | **Strong now** | Geometry Health (Swift/SwiftUI stroke app) |
| **ROS / ROS2 + robotics (REQUIRED)** | **Not covered** | See "The real gap" below |

## Claims to confirm before sending

Mostly resolved now. Two small ones remain:

1. **AWS (S3 / EC2 / SageMaker).** DeepRacer is your concrete anchor; the broader company rollout is upcoming. If you've only used the DeepRacer console, trim to "AWS (DeepRacer)" until you've actually touched S3/EC2/SageMaker, then add them back.
2. **scikit-learn.** Keep only if you've actually used it (most ML coursework does). Drop otherwise.

## On disclosure / CUI

Your **Geometry Health** work is your own company — there's nothing sensitive about listing it, HIPAA-compliance and all. Include it freely; it's your best entry.

The CUI (Controlled Unclassified Information) caution applies to your **AFRL federal** work, not Geometry. Your AFRL bullets are already written at a general, results level ("novel imaging modalities," "50 percentage points") without naming systems, targets, datasets, or program specifics — which is the right instinct. Before submitting, do a quick self-check that no bullet names a specific sensor, dataset, platform, or program, and if you're unsure whether "imaging modalities" is releasable, confirm with your AFRL mentor/POC what's cleared for public use. When in doubt, keep it vaguer.

## The real gap: ROS / ROS2 and robotics

This is the only required qualification you don't have, and I didn't fake it. Here's exactly where to get it and how fast.

### Where to learn it (free first, then optional paid)

- **Official ROS 2 tutorials — `docs.ros.org`** (use the **Jazzy** or **Humble** distro). The "Beginner: CLI Tools" + "Beginner: Client Libraries" sections get you writing real nodes. This is the canonical source and free.
- **The Construct — `app.theconstruct.ai`.** Browser-based ROS courses with simulators built in, so you don't have to install anything. Best if you want to move fast without Linux setup. Free tier + paid subscription.
- **Articulated Robotics (YouTube).** The clearest free beginner video series; great for actually understanding what's happening.
- **"ROS2 for Beginners" by Edouard Renard (Udemy).** ~$15–20 on sale, very structured, Python + C++ nodes. Optional but efficient.
- **Simulators to pair with the above:** **Gazebo** (physics sim) and **TurtleBot3** (standard learning robot, fully simulated — no hardware needed). Then the **Nav2** (navigation) and **MoveIt 2** (manipulation) tutorials map directly to the JD's "navigation, manipulation."

### The minimum that earns a truthful bullet (a weekend)

1. Install ROS 2 (or use The Construct) and run `turtlesim` + a talker/listener node in **Python (`rclpy`)** and **C++ (`rclcpp`)** — this hits "build ROS2 modules" *and* your C++ story.
2. Do one Nav2 tutorial and one MoveIt 2 tutorial in Gazebo.
3. Then add, truthfully: *"Built ROS 2 (rclpy/rclcpp) nodes for navigation and manipulation in Gazebo simulation, integrating sensor data-collection workflows."*

### Should you hold off on submitting?

**My recommendation: don't hold off — but start ROS 2 today and apply within a few days**, so you can honestly say you've begun building with it. Reasoning:

- Postings fill or close; a delayed "perfect" application often loses to a strong "good" one that arrived while the role was open.
- Your profile is genuinely strong for an early-career hire (CV/GANs, PyTorch, biometric data-collection app, RL via DeepRacer, IEEE publication). "Required" is frequently flexible at this level, especially when the rest is a close fit.
- Initiative reads better than a gap. "I don't have ROS yet, I started the official ROS 2 tutorials this week and have turtlesim nodes running in Python and C++, and I'll be production-ready fast" is a *strong* answer. "I have zero ROS" is weak. A few evenings of tutorials moves you from the second to the first.

**How to phrase it to the hiring manager** (cover letter or note):

> "I want to be upfront: I don't yet have production ROS/ROS2 experience. I've started the official ROS 2 tutorials and am building nodes in both Python and C++, and given my background in PyTorch pipelines, reinforcement learning for autonomous control (AWS DeepRacer), and a biomarker data-collection app, I'm confident I'll ramp quickly. I'd rather be honest about the gap and show you I'm already closing it."

**The one case for waiting:** if the posting states ROS as a hard multi-year requirement *and* will clearly still be open in 2–3 weeks, spend a weekend getting the turtlesim + Nav2/MoveIt bullet first, then apply with it already on the resume. Even then, apply within that window, not "someday."

## LaTeX / Overleaf notes

- Your site pipeline builds `files/Resume.pdf` from `resume/Resume.tex` on push. Port these bullets into `Resume.tex` and commit — the GitHub Action rebuilds the PDF automatically.
- Keep it one page. If you add the ROS 2 bullet later, drop the weakest current line (e.g., Racket Parser) to stay at one page.
- The docx uses a navy accent (`#1F3864`) and Calibri; match your LaTeX template's own styling if you prefer — the content is what matters.
