# Handshake AI: resume and profile guide

Goes with `public/files/Resume_HandshakeAI.docx` and `.pdf`. This file lives in `resume/`, not `public/`, so the site doesn't deploy it.

## What Handshake AI screens for

Handshake AI pays experts to train and evaluate LLMs. For text work, that means ranking two or more model responses, grading them against a rubric, writing prompts that trip up the model, and explaining in writing why one answer is better. Handshake advertises up to $100/hr for master's and PhD fellows, and technical fields such as CS pay the most. The recruiter and the intake assessment look for three things:

1. Depth in a field they need experts in (CS, ML, coding).
2. Evidence that you can judge output and explain your judgment clearly.
3. Care: catching the answer that sounds right but isn't.

The resume is built around those three things. The Mercor version sold you as an engineer who builds datasets. This one sells you as someone who evaluates models.

## What changed from the Mercor resume

- **Summary** covers comparing models, evaluation harnesses, catching wrong answers that sound right, and writing up why. Every clause maps to a real item below it.
- **Georgia Tech date fixed.** The Mercor resume lists the M.S. as "Aug 2025," which reads as finished. The site and `resume.tex` both say expected 2027.
- **Geometry Health** now opens with the grounded, cited LLM assistant, then prompt construction and model routing. The iOS port moved to third. "Within a fraction of a percent" matches the site. The 0.56% figure (in `resume.tex` and the Jumio guide) was left off because the site calls the method proprietary.
- **Ransomware work is split in two.** The NSF 2024 bullet keeps the paper's 99%/91%. The new "Ransomware Model Comparison" project uses the repo's 98.4% and names the weak 12-family result. `bot/knowledge/20-about.md` says the two runs must not be mixed. Showing a failure you understand helps with evaluator recruiters.
- **"in Washington, D.C." removed.** Your talk was pre-recorded, and naming the city implies you were in the room.
- **New research section, built for text evaluation:**
  - Dysarthria ASR evaluation. Your strongest item for this platform: an evaluation harness, and a qualitative finding that Whisper produces fluent, wrong English while wav2vec2 produces visibly broken text. That is hallucination analysis on text output.
  - Portfolio chatbot on gmango.dev. Prompt iteration against test questions, plus a script that tests each model in the failover chain. `questions.jsonl` is almost all your own test strings, so this line does not say "visitor questions."
  - DeepRacer reward shaping, described as a reward *designed* against gaming. No source shows it worked, so the line doesn't claim that.
- **Publications section added**, including the IEEE TDSC 2025 paper. The Mercor resume didn't mention it, and being published signals expertise.
- **Skills** now start with a "Model evaluation" line that uses Handshake's own terms.
- Contact link points to gmango.dev.
- Dropped: the Phonebook project and the Mercor ETL/data-infrastructure line. Neither helps with text evaluation.

## Handshake profile copy

Recruiters search the profile, not only the uploaded file. Paste these in.

**Headline**
> M.S. CS (AI) @ Georgia Tech · IEEE-published ML researcher · Python, PyTorch, model evaluation

**About / summary**
> I'm a Georgia Tech M.S. Computer Science student (AI emphasis) and an IEEE-published ML researcher. Most of my work comes down to judging model output. I built the evaluation harness for a speech-recognition study where Whisper produced fluent English that was wrong. I compared transformer models against baselines for ransomware detection, building on my IEEE Big Data 2024 paper. I also ship a clinical LLM assistant that must cite PubMed evidence instead of making things up. I design reinforcement-learning reward functions, so I know how a model can game a rubric. I write clearly about why one answer beats another. I speak English, Spanish, and Amharic.

**Skills to add as tags:** Python, PyTorch, Machine Learning, Deep Learning, Large Language Models, Natural Language Processing, Reinforcement Learning, Prompt Engineering, Model Evaluation, Technical Writing, C++, Java, SQL, Spanish, Amharic.

**Areas of expertise to select:** Computer Science, then Machine Learning / AI and Software Engineering / Coding if offered. Also mark Spanish and Amharic if multilingual projects are offered. Few people speak Amharic, so those projects can be hard to staff.

## Getting into the $50+/hr text projects

- **Take the domain assessment as CS/ML, not generalist.** Generalist projects pay the least. Rate follows the domain you're approved for.
- **Write justifications like code review.** Name the exact error, say why it matters, and say what the better response does. Your "fluent but wrong" Whisper finding is the model to follow.
- **Mention your graduate enrollment and publications** wherever the application asks about credentials. Master's and PhD status unlocks the higher rate bands.
- **Stay active after you're approved.** Projects go first to fellows who respond quickly and pass quality review.

## Check these before sending

1. **Language level.** The resume just lists Spanish and Amharic. If Handshake offers multilingual projects, it tests fluency, so select only the languages you can work in professionally.
2. **The Big Data title** comes from a commented-out line in `resume.tex`, and there's no DOI on the site. Confirm the exact title against the program or proceedings.
3. **Cloud routing (Geometry Health).** This comes from the Jumio guide, which drew on your GHW codebase. The site only says "self-hosted." Keep "cloud LLM providers" only if that is still how the system runs.
4. **AFRL title.** The resume and site say "Contractor / Internship Program." `resume.tex` says "Research Engineer / Contracting Program." Use the same wording everywhere.
