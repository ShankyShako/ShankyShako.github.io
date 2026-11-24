import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/* React games by slug, each loaded on its own only when its page opens, so
   the rest of the site never downloads game code. Add one as:
     'workout-simulator': lazy(() => import('./workout/WorkoutGame')),
   and set its status in src/data/games.ts to 'playable'. */
export const gameComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  'workout-simulator': lazy(() => import('./workout/WorkoutGame')),
};
