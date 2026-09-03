export type Publication = {
  title: string;
  /** In publication order. The site owner is matched by surname and bolded. */
  authors: string[];
  venue: string;
  /** Volume / issue / pages / date, as a journal would print it. */
  where: string;
  year: string;
  /** Bare DOI. The card builds the doi.org link from it. */
  doi: string;
  /** Open-access preprint, where one exists — IEEE Xplore is paywalled. */
  preprint?: string;
  tags: string[];
  blurb: string;
};

export const publications: Publication[] = [
  {
    title:
      'Securing Virtual Reality Experiences: Unveiling and Tackling Cybersickness Attacks With Explainable AI',
    authors: [
      'Ripan Kumar Kundu',
      'Matthew Denton',
      'Genova Mongalo',
      'Prasad Calyam',
      'Khaza Anuarul Hoque',
    ],
    venue: 'IEEE Transactions on Dependable and Secure Computing',
    where: 'vol. 22, no. 6, pp. 6040–6057',
    year: '2025',
    doi: '10.1109/TDSC.2025.3579969',
    preprint: 'https://arxiv.org/abs/2503.13419',
    tags: ['Adversarial ML', 'Explainable AI', 'Virtual Reality', 'Security', 'Deep Learning'],
    blurb:
      "In modern VR, a deep-learning model is what decides when cybersickness mitigation fires — so fooling that model is enough to break the experience. The paper introduces the cybersickness attack: a perturbation of the input small enough to be invisible to the person wearing the headset, but sufficient to suppress detection, so mitigation never triggers and the user stays sick. It then proposes an explainable-AI-guided framework that detects the attack and restores the correct mitigation. Evaluated on two open-source cybersickness datasets, Simulation 2021 and Gameplay, then confirmed on a custom VR roller-coaster testbed running on an HTC Vive Pro Eye, with a user study measuring the damage to immersive experience and the recovery. The work grew out of the NSF REU in Consumer Networking at the University of Missouri.",
  },
];

/** IEEE-style citation line, the form you would paste into a reference list. */
export function cite(p: Publication): string {
  const initialled = p.authors.map((a) => {
    const parts = a.split(' ');
    const surname = parts.pop();
    return `${parts.map((n) => `${n[0]}.`).join(' ')} ${surname}`;
  });
  const authors =
    initialled.length > 1
      ? `${initialled.slice(0, -1).join(', ')} and ${initialled.at(-1)}`
      : initialled[0];

  return `${authors}, "${p.title}," ${p.venue}, ${p.where}, ${p.year}, doi: ${p.doi}.`;
}
