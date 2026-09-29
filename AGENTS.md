<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- All HTTP to the local FastAPI backend goes through `src/services/*` (`api.ts` owns fetch); UI never calls fetch — keeps the backend swappable and endpoints in one place.
- Client state (companions, conversations, models, settings) lives in the zustand store `src/stores/appStore.ts` with `skipHydration` + `useHydrateStore`; avoids SSR/localStorage hydration mismatches.
- Model lists are always fetched from `GET /models`; never hardcode model ids.
- The 3D companion renders only through `components/companion/Companion3D.tsx`, lazy-loaded inside `ClientOnly`; three.js must not enter the SSR bundle.
- Unimplemented local capabilities (image generation, voice, long-term memory) are stubbed as throwing service seams (`services/images.ts`, `services/voice.ts`) — never faked in the UI.
