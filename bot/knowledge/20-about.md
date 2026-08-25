# Context that is not on the site

> **This file is what separates a useful bot from a search box.** The section
> above it is already public — a visitor can read the same words on the page.
> What a model cannot get anywhere else is *judgement*: why the work connects,
> what was hard, what he wants next. That is what goes here.
>
> **This repo is public.** Anything written in this file ships to GitHub. For
> anything you would not put on the site itself — salary floor, specific
> companies, how a role ended — use a file named `*.local.md` in this same
> directory. Those are gitignored and load exactly the same way.
>
> Lines marked **TODO** are the ones only Genova can answer. Every one you fill
> in makes the bot noticeably less generic. Delete this blockquote when you are
> done.

## What he is looking for right now

**TODO — the single highest-value thing in this file.** Recruiters open a chat
bot to ask this. Answer in your own words:

- Actively looking, open to hearing about things, or not looking?
- What kind of role: research vs. applied ML vs. platform/infra vs. security?
- Industry or mission he cares about, and any he would turn down?
- Company size and stage he does well in?
- Timeline — available when? How does the Georgia Tech M.S. schedule interact?
- Location: Kansas City based. Remote, hybrid, on-site? Would he relocate, and
  where to?
- Work authorization, if it is something he wants stated. *(Leave blank and the
  bot will say it does not know and offer to pass the question along — a
  perfectly good answer.)*

## The through-line

**TODO.** Five roles across five years looks scattered on a resume: NASA signal
propagation, cybersickness transformers, ransomware LLMs, GAN-generated
training data, a blockchain model registry. There is an argument that it is one
coherent interest. Make it, in three or four sentences, and the bot will make
it too instead of reading the list back.

*A starting read, from the repo — rewrite or throw it out:* every project is
about making a model work where the real data is missing, expensive, or
untrustworthy. Synthetic data standing in for scarce imagery at AFRL, API-call
traces standing in for ransomware you cannot safely collect, on-chain
attestation standing in for trusting whoever handed you a model. Different
domains, same problem.

## Behind the work

The site says what each project *is*. It never says what was hard. For each of
the big ones, two or three sentences on the part that actually took the time:

### AFRL — game-theoretic GAN training

**TODO.** The site claims a ~50 percentage-point downstream improvement, which
is a very large number and a sharp recruiter will ask about it. Worth having
ready:

- What the game-theoretic framing actually changed about training. Which game?
  What were the players optimizing?
- 50 points over *what* baseline, on what task? Why was the baseline so low?
- What the novel imaging modality was, to whatever depth is releasable.
- What broke first, and what fixed it.
- **Anything covered by the DoD/AFRL agreement that must not be discussed.**
  Write the boundary down explicitly — the bot will respect a stated limit and
  will happily overshare without one.

### Ransomware detection — IEEE Big Data 2024

**TODO.** Solo author at an IEEE conference as an undergrad is the strongest
credential on the site and it is buried in a paragraph. Worth capturing:

- Why transformers for API-call sequences rather than a gradient-boosted
  classifier on the same features? What did attention actually buy?
- ~31,000 features cut to 1,000 by chi-squared — what fell out, and did it
  cost anything?
- Binary hits ~98-99% but family classification only ~85%. Which families does
  it confuse, and why? *Being able to name your own model's weakness is more
  persuasive than the headline number.*
- What D.C. was like. One human sentence beats another metric.

### Federated blockchain model registry

**TODO.** The obvious question is "why does this need a blockchain?" Have the
honest answer — including if part of it is "because it was the interesting way
to learn Solidity." Also: does anything actually run on it today, or is it a
working demo?

### Anything not on the site

**TODO.** Something in progress, something abandoned, something you built for
yourself. The bot can mention work the pages do not cover, and it is the
clearest signal that it is more than a search index.

## How he works

**TODO.** Two or three sentences a colleague would recognise. PyTorch by hand
or high-level frameworks? Reads the paper first or runs the baseline first?
Comfortable on Slurm and multi-GPU, or laptop-scale? Where does he ask for
help? What kind of work drains him?

## Opinions

**TODO.** Three or four takes he will defend, on anything technical — model
scale vs. data quality, whether synthetic data actually generalises, security
theatre in ML, agents, the state of ML tooling. A bot with no opinions is
furniture. A bot that says "he thinks X, though he would push back on Y" sounds
like it has met him.

Keep them defensible: a visitor may quote one back in an interview.

## Human texture

Facts the site technically contains but never uses well. The bot should reach
for these when a conversation is going well, never as a party trick.

- **Trilingual** — English, Spanish, Amharic. **TODO:** the story there, and
  whether he wants it mentioned at all.
- **He paints.** The /shop page is real work — oil, ink, digital, a felt Among
  Us sticker — priced seriously and entirely sold out. **TODO:** does he still
  make things? Were they actually sold, or is "sold out" the joke?
- **The site is full of easter eggs.** Right-click the profile photo (long-press
  on mobile) and the whole palette flips to black-and-red with its own
  soundtrack. The bot may hint that the photo does something if a visitor seems
  like the type to enjoy it. It should never explain the mechanism outright, and
  it should never mention the devtools trap.
- **The bot itself is the exhibit.** It runs on one of Genova's own laptops,
  behind a tunnel, on a small open-weight model. **TODO:** name the machine and
  the model if you want the bot to be specific about it — visitors who ask this
  are usually engineers, and a concrete answer lands better than a vague one.
  If the laptop is closed,
  the chat button is not there at all. Visitors who ask how it works should get
  a straight, slightly amused answer: this is an AI engineer's site, so the AI
  is his, not an API key pointed at somebody else's.

## Steering

- **TODO:** what should the bot nudge people toward? The research page? The
  GitHub? Getting an email address into his inbox?
- **TODO:** anything it should never bring up unprompted.
