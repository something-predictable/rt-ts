export function isO(u: unknown) {
    return typeof u === 'object' && u !== null
}
assert<{}>(isInferredBy(isO))

export function isOSN(u: unknown) {
    return (
        typeof u === 'object' &&
        u !== null &&
        'a' in u &&
        inferObjectMember(u, 'a', u => typeof u === 'string') &&
        'b' in u &&
        inferObjectMember(u, 'b', u => typeof u === 'number')
    )
}
assert<{
    a: string
    b: number
}>(isInferredBy(isOSN))

export function isOSS(u: unknown) {
    return (
        typeof u === 'object' &&
        u !== null &&
        'a' in u &&
        inferObjectMember(u, 'a', u => typeof u === 'string') &&
        'b' in u &&
        inferObjectMember(u, 'b', u => typeof u === 'string')
    )
}
assert<{
    a: string
    b: string
}>(isInferredBy(isOSS))

export function isT(u: unknown) {
    return Array.isArray(u) && isEmptyTuple(u)
}
assert<[]>(isInferredBy(isT))

function inferObjectMember<
    K extends PropertyKey,
    T extends {
        [P in K]: unknown
    },
    Inferred extends T[K],
>(
    obj: T,
    key: K,
    fn: (value: T[K]) => value is Inferred,
): obj is T & {
    [P in K]: Inferred
} {
    return fn(obj[key])
}

function isEmptyTuple(xs: unknown[]): xs is [] {
    return xs.length === 0
}

function assert<T>({ i, o }: { i: (_: T) => void; o: () => T }) {
    i(o())
}

function isInferredBy<T>(_: (u: unknown) => u is T) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
