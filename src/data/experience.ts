export type Role = {
  org: string;
  title: string;
  date: string;
  blurb: string;
};

export const experience: Role[] = [
  {
    org: 'AFRL Sensors Directorate Internship Program, University of Dayton',
    title: 'Federal AI/ML Engineer Contractor',
    date: 'May 2025 – August 2025',
    blurb:
      "Pioneering the development of generative AI models enabling a CNN classifier to successfully recognize real objects when trained on generated data when utilized in transfer learning framework, addressing AFRL/DoD priorities. Using PyTorch, adapting state of the art classifiers to handle novel imaging modalities. Utilizing slurm to enable large batches of parallelized computation. Creating an innovative game theory approach to GAN training, significantly improving the results of the generator's development. The generative model's output is expected to lead to an increase of 50 percentage points in the downstream classifier compared to the baseline.",
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
