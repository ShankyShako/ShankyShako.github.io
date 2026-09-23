import { Reveal } from '../components/Reveal';
import { Personalizer } from '../components/resume/Personalizer';

export function Resume() {
  return (
    <>
      <h1>Résumé</h1>
      <Reveal>
        <Personalizer />
      </Reveal>
    </>
  );
}
