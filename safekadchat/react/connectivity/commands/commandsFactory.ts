export default function commandsFactory<Type extends string, T extends (string| number)[]>(type: Type, ...args :T) {return (
    {
        type,
        args
    }
) as const }