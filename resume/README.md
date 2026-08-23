# Resume source

Put your Overleaf LaTeX source here as **`Resume.tex`** (plus any `.cls`,
`.sty`, images, or `.bib` files it needs).

## How the live pipeline works
1. You edit the resume (in Overleaf or locally) and the `.tex` lands here.
2. On every push that touches `resume/`, the GitHub Action
   `.github/workflows/build-resume.yml` compiles `Resume.tex` and copies the
   result to `files/Resume.pdf` — the exact file your site's Resume tab loads.
3. The site updates automatically. No manual PDF export.

## Getting your source out of Overleaf
- Manual: Overleaf → Menu → Source → download, drop `Resume.tex` here, commit.
- Automatic (Overleaf premium): use Overleaf's GitHub sync so it pushes the
  source to this repo for you; the Action handles the rest.

## One-time setup
GitHub → repo Settings → Actions → General → Workflow permissions →
enable **"Read and write permissions"** so the Action can commit the rebuilt PDF.
