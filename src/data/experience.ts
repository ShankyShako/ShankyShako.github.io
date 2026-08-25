export type Role = {
  org: string;
  title: string;
  date: string;
  blurb: string;
};

export const experience: Role[] = [
  {
    org: 'Geometry Health and Wellness',
    title: 'Founding AI/ML Product Engineer',
    date: 'September 2025 – Present',
    blurb:
      'Founding engineer on a clinical mobility platform, taken from MVP to production. Ported clinically validated mobility assessments from MATLAB research prototypes to a production iOS app, matching the clinical reference within 0.56% on a 15-biomarker postural-sway test and reproducing 10-meter-walk gait speed exactly. Built the on-device biomarker signal-processing pipeline in Swift — 100 Hz CoreMotion capture, gravity removal, zero-phase Butterworth band-pass filtering, double integration, and PCA into 15 biomarkers with automated quality flags — alongside the in-house data-collection app that exports each trial as timestamped JSON, building the labeled datasets the models are validated against. Implemented an end-to-end LLM workflow for a context-aware clinical assistant (data preparation, patient-context retrieval, and PubMed/NCBI evidence via Entrez) on a self-hosted Ollama DeepSeek-V2 16B deployment with Flask REST and WebSocket streaming under one second of latency. Owns the technical architecture, sprint cycles, and coordination across clinical, engineering, and product.',
  },
  {
    org: 'AFRL Sensors Directorate Internship Program, University of Dayton',
    title: 'Federal AI/ML Engineer Contractor',
    date: 'May 2025 – August 2025',
    blurb:
      "Pioneered the development of generative AI models enabling a CNN classifier to successfully recognize real objects when trained on generated data when utilized in transfer learning framework, addressing AFRL/DoD priorities. Using PyTorch, adapted state of the art classifiers to handle novel imaging modalities. Utilized Slurm to enable large batches of parallelized computation. Created an innovative game theory approach to GAN training, significantly improving the results of the generator's development. The generative model's output led to an increase of 50 percentage points in the downstream classifier compared to the baseline.",
  },
  {
    org: 'NSF REU AI-Empowered Cybersecurity, University of Missouri Kansas City',
    title: 'AI/ML Engineer Intern',
    date: 'June 2024 – December 2024',
    blurb:
      'Engineered a robust Large Language Model to detect ransomware threats within Industrial Control Systems. Achieved 99% accuracy for binary classification and 85% accuracy for family classification scale respectively. Research was accepted and presented at IEEE Big Data 2024 in Washington, D.C. as the solo author with mentor guidance.',
  },
  {
    org: 'NSF REU in Consumer Networking, University of Missouri Columbia',
    title: 'Research Intern',
    date: 'May 2023 – July 2023',
    blurb:
      'Designed a model that detects/predicts cybersickness using a transformer machine learning model. Succeeded with an accuracy of 85% from a 1-10 cybersickness severity scale.',
  },
  {
    org: 'NASA Missouri Space Grant Consortium',
    title: 'Research Intern',
    date: 'December 2021 – April 2022',
    blurb:
      'Engineered an AI-driven simulation of space-bound transmissions as part of a NASA-funded initiative analyzing signal propagation and identifying optimal frequency bands under varying conditions. Developed an interactive interface to visualize transmission strength and provide adaptive frequency recommendations based on environmental parameters.',
  },
  {
    org: 'SPCN - 2020 and IEEE Brain Initiative BDBC Conference, Taiwan',
    title: 'Web Master',
    date: 'August 2020 – September 2020',
    blurb:
      "Set up conference website for the 5th International Symposium on Audio and Video Signal Processing in the Context of Neurotechnology, with reliable communication and updates to the website's needs. The conference was conducted remotely through multiple worldwide locations.",
  },
];
