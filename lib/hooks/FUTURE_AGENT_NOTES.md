# Future Agent Notes — `lib/hooks/`
_Logged: 7 October 2025_

## Contents
- `useAsyncStorage.ts` — Generic persistent state hook wrapping React state with AsyncStorage reads/writes. Returns `[value, setValue, isLoading]`.

## Tips
- Use this hook inside contexts for lightweight persistence.
- Keep hook logic generic; specialise behavior in the consuming context/provider.
