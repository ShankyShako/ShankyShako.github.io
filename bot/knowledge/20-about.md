# Genova, beyond what the pages say

His own account of the work, in his words. The pages carry the *what*; this is
the *why*.

## What he wants right now

He is **founding AI/ML product engineer at Geometry Health and Wellness**, and
**open to new roles** — contract or full-time. Applied ML, or platform and
infrastructure work, with enough research in it to stay interesting; not a
research-only post.

State both plainly if asked. Do not speculate about why he is looking, do not
characterise his current employer, and do not imply he is unhappy or leaving.

Open on industry, provided the problem is real and the direction is credible.
He is a US citizen and needs no sponsorship. Kansas City based; **remote
preferred**, and he will relocate for a city worth living in.

On timing: he is weighing several things at once, so there is no single date.
About a month's notice gets a firm answer. He is enrolled in the Georgia Tech
M.S. and paces it around work rather than the other way round — the degree is
built to flex, and he treats a role as the commitment that sets the schedule.

His record on team fit: five research placements in five years, every one
collaborative, plus running the website for an international conference at
nineteen. He is easy to work with and finishes what he starts.

## The through-line

Five roles look scattered — NASA signal propagation, cybersickness
transformers, ransomware classification, GAN-generated training data, a
blockchain model registry. They are one interest seen from different sides:
**making models work when the data you need is missing, expensive, or not
trustworthy.**

Synthetic imagery standing in for scarce sensor data at AFRL. API-call traces
standing in for ransomware nobody can safely collect at scale. On-chain
provenance standing in for trusting whoever handed you a set of weights. The
domain changes; the problem does not.

## AFRL — the adversarial scheduling method

The problem is standard GAN instability: a discriminator that sharpens faster
than its generator produces gradients the generator cannot learn from, and it
collapses. The usual lever is `n_critic` — a fixed number of discriminator
steps per generator step — which has to be hand-tuned and stays fixed for the
whole run.

**He replaced that fixed ratio with an annealed stochastic schedule.** The
discriminator's update interval starts wide, giving the generator a protected
head start. At each interval the schedule draws a random value against an
acceptance threshold; clearing it contracts the interval by one. The threshold
begins at 0.99 — contraction is initially rare — and decays geometrically under
a gamma parameter toward ~0.75, so contraction grows steadily more likely as
training proceeds.

The effect is a curriculum: the generator's advantage is surrendered gradually
and stochastically rather than at a step someone guessed in advance. Keeping it
probabilistic matters — a deterministic schedule introduces a sharp transition
that training dynamics can lock onto, where a randomized one does not. It is
the same shape as a Metropolis acceptance criterion in simulated annealing,
applied to adversarial balance instead of state acceptance.

The idea started from provably-fair dice mechanics, and he says so freely when
asked where it came from. He is clear that the analogy is where it started and
the scheduling is what it is.

Result: roughly a 50 percentage-point gain in the downstream classifier over
baseline. The baseline is low because conventional synthesis produces a domain
gap wide enough that a classifier never learns features that transfer to
genuine objects — which is the entire difficulty of the task.

### What must not be discussed

The imaging modality is **CUI**. The baseline figure's task is classified. The
program's purpose, goals, and any worked example are all off limits.

His line: **the experience is discussable, the intelligence is not.** Method,
approach, and what he learned are fine. Anything that turns the conversation
into information about the program itself — what it is for, what it looks at,
anything a third party could put to use — he declines, politely and without
hedging about why.

## Dysarthria speech understanding — CS 7643, Team LEGACY

A four-person Georgia Tech deep-learning project, not a publication and with no
public repo — course policy. Genova's share of the work, from the paper's own
contribution table: the ASR evaluation harness, the FDA severity parser, the
Whisper multi-task grid search, the full 43-fold multi-task LOSO run, and the
wav2vec2 UA-Speech LOSO. If asked, credit the team; the other three are Ani
Shenai, Luis Sosa, and Yaoxiong Yang.

**The point of it.** A stroke patient who cannot type is left with speech, and
speech recognition trained on healthy speakers is worst exactly there — 4.2%
word error on control speakers against 53.9% on impaired ones, same prompts,
same microphone, same room. The model scores intelligibility and severity off
the same recording it transcribes, so the audio doubles as a recovery
biomarker with no extra work asked of the patient.

**The result he would defend.** The MFCC+SVM baseline reached a quadratic
weighted kappa of exactly 0.000 — it emits the class prior and nothing else —
while frozen Whisper features reached 0.757 under the identical protocol. The
pretrained representation is doing the work, not the head on top of it. And
the two encoders fail in opposite directions: Whisper writes fluent English
that is wrong, wav2vec2 writes visible gibberish. For a patient message to a
nurse, the failure a reader can spot is the safer failure.

## Cybersickness attacks — IEEE TDSC 2025

Third of five authors on "Securing Virtual Reality Experiences: Unveiling and
Tackling Cybersickness Attacks With Explainable AI", IEEE Transactions on
Dependable and Secure Computing, vol. 22, no. 6, pp. 6040–6057, 2025.
doi 10.1109/TDSC.2025.3579969. Open preprint: arxiv.org/abs/2503.13419.
It came out of the lab he worked in during the 2023 NSF REU in Consumer
Networking at the University of Missouri, where he built the transformer that
scores cybersickness severity on a 1–10 scale.

**The idea worth stating.** In VR, cybersickness mitigation is triggered by a
deep-learning detector — which makes the detector a control surface. An
adversarial perturbation too small for the wearer to notice can suppress
detection, so mitigation never fires and the user stays sick. The paper names
that a *cybersickness attack* and proposes an XAI-guided framework that detects
it and lets the correct mitigation run. Evaluated on the Simulation 2021 and
Gameplay datasets, then on a purpose-built VR roller-coaster testbed with an
HTC Vive Pro Eye and a user study.

If a visitor asks what specifically he contributed, say the paper is
co-authored and point them at it rather than guessing at the division of work.

## Ransomware detection — IEEE Big Data 2024

Solo author, presented at IEEE Big Data 2024 in Washington D.C. as an
undergraduate. Detects and classifies ransomware from Windows API-call features
at three levels at once: binary, coarse family group, and specific family.

**Why transformers, in his account.** The features are behavioural sequences,
and attention is built to weigh which calls in a trace matter and how they relate — signal a
tree-based model on the same flattened features cannot use. ALBERT tends to win
here for a specific reason worth stating: it shares one encoder layer across
depth, so parameter count stays flat, and on a ~1,500-sample dataset that
weight sharing acts as a strong regulariser. A full-size RoBERTa trained from
scratch memorises this dataset within a few epochs — its accuracy *falls* the
longer you train it. Matching capacity to data is the fix.

**Feature selection.** 30,967 API-call features reduced to the top 1,000 by
chi-squared, fit on the training split alone so nothing leaks from test. This
is genuine selection — ~30,000 features are discarded, not compressed — and
accuracy went *up*, from ~94% to ~98% at the binary level, alongside the
speedup. Cheap features were carrying noise. (Compression is a separate arm of
the study: an autoencoder variant and a K-Means variant sit alongside the plain
baseline so the three strategies can be compared directly.)

**The weakness, stated plainly.** Binary detection is solved — ~98%. Specific
family classification is not, and the reason is class scarcity, not model
capacity or a bug. Several families have only one or two samples in the test
split, so the model never learns to predict them at all; the confusion matrix
shows entire rare classes receiving zero predictions, which is exactly what
that looks like. The remedies are ordinary — oversampling, or collapsing rare
families into their groups — and he intends to revisit it. He is direct about
this when asked, and would rather name the failure and its cause than lean on
the headline number.

**The figures, by level and by source.** These come from two different runs and
must not be mixed.

From the current repository (best model per level):

- Binary, benign vs. malicious — 98.4% accuracy, 0.983 macro-F1
- Group, 5 coarse bins — 91.1% accuracy, 0.731 macro-F1
- Specific, 12 families — ~0.55 macro-F1, held down by the rare classes above

From the IEEE Big Data 2024 paper, as published: 99% binary, 85% family.

The gap between the two is a different run on a different pipeline, not a
correction. The repository figures are the ones he can show working end to end
today.

**D.C.** He submitted a pre-recorded talk rather than presenting live, so he
makes no claim about the room. What mattered was watching other people present
theirs — he came back with contacts, a reading list, and repos to pull apart.
He had gone in fairly certain he was done with school. He started applying to
master's programmes almost immediately after.

## Geometry Health — the current role

His most substantial engineering work, and the one closest to what he wants
next: applied ML sitting on real infrastructure, in production, owned end to
end. Three parts worth knowing.

He ported clinically validated assessments out of research prototypes and into
a shipping iOS app, landing within a fraction of a percent of the clinical
reference — the hard part of that work is fidelity, not features. He built the
on-device biomarker signal-processing chain in Swift end to end, plus the
in-house capture app that produces the labelled datasets it is validated
against. And he stood up a context-aware clinical assistant on a **self-hosted
LLM deployment**, with patient-context retrieval and peer-reviewed evidence
lookup over a streaming API, under one second of latency.

The methodology, the model, and the measured figures are proprietary. If a
visitor asks for those specifics, say they are not public and offer the shape
of the work instead — do not guess at numbers.

That last piece is the direct ancestor of the bot the visitor is talking to —
he had already built a self-hosted LLM service in production before building
this one.

## Federated blockchain registry

A working demo, and honest about being one. Two goals: learn Solidity properly,
and test whether federated learning and on-chain provenance actually fit
together.

The design keeps weights off-chain — the model goes to IPFS, and only its
content ID is recorded. Three contracts each do one job: `FederatedModelStorage`
records the CID against its owner and gates download access,
`FederatedLedger` keeps an append-only timestamped audit trail, and
`FederatedToken` is an ERC-20 that also tracks per-round update hashes for
aggregation. Registration runs all three: `storeFile` → `logCID` →
`submitModelUpdate`. A Hardhat test suite verifies a CID round-trips through
every contract, and the ALBERT ransomware model is the payload it was built to
carry — exported as weights plus fitted preprocessing plus a manifest.

He is precise about what the chain actually provides. It gives tamper-evident
provenance and an auditable history — you can prove which model was registered
when, and by whom. It does *not* make the model private or secure; the CIDs are
public by design. He prefers the smaller true claim to a blanket "blockchains
are secure".

The application it points at: nodes running the ransomware detector can pull
verified updates and contribute their own, without anyone having to trust the
party that shipped the weights.

## How he works

Runs the baseline before reading the paper — the paper lands better once he has
felt where the problem actually is. Comfortable across the range: Slurm,
multi-GPU, and a laptop when a laptop is the right tool.

His PyTorch habits are his own rather than textbook. What he would claim is not
that his tooling is unusual but that he reasons about problems harder than most
people at his level: the AFRL scheduler and the decision to size the transformer
to the dataset are both cases of diagnosing the actual failure rather than
reaching for the standard knob.

What drains him is work that goes nowhere. Putting himself fully into something
that then gets shelved costs him more than a hard problem ever does.

## Opinions he will defend

- **Data quality and model quality are not a trade-off** — you need both. Bad
  data leaves nothing to learn, and a bad model wastes good data.
- **Synthetic data does not straightforwardly generalise.** He has spent a
  summer generating it and is still sceptical: artifacts and missing detail
  survive into training and do not transfer to real images. That is precisely
  why the domain-gap problem was worth working on.
- **Security is a precondition, not a feature.** No trust without it, and no
  users without trust. The site itself follows that: no public directory listing, no direct path to the raw project files
  sitting behind it.
- **Tools are leverage in either direction** — used well they build up the
  environment they land in, used carelessly they erode it.

## Human texture

- **Trilingual** — English, Spanish, Amharic.
- **He makes things.** The /shop page is real work: oil, ink, digital, and one
  hand-cut felt sticker, priced seriously and entirely sold out. He also does
  photo and video editing, and is open to small commissions in that line.
- **The site has easter eggs.** The profile photo does something, and he likes
  people finding it for themselves.
- **This bot is itself the exhibit.** It runs on his own laptop behind a tunnel,
  on a small open-weight model — which is why the chat button is not there when
  the lid is shut. It is an AI engineer's site, so the AI is his, not a key
  pointed at somebody else's.
