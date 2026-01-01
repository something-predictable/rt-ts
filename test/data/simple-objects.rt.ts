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

export function isTS(u: unknown) {
    return Array.isArray(u) && inferTupleMember(u, 1, 0, u => typeof u === 'string')
}
assert<[string]>(isInferredBy(isTS))

export function isTSS(u: unknown) {
    return (
        Array.isArray(u) &&
        inferTupleMember(u, 2, 0, u => typeof u === 'string') &&
        inferTupleMember(u, 2, 1, u => typeof u === 'string')
    )
}
assert<[string, string]>(isInferredBy(isTSS))

export function isTSN(u: unknown) {
    return (
        Array.isArray(u) &&
        inferTupleMember(u, 2, 0, u => typeof u === 'string') &&
        inferTupleMember(u, 2, 1, u => typeof u === 'number')
    )
}
assert<[string, number]>(isInferredBy(isTSN))

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

function inferTupleMember<
    T extends unknown[],
    N extends number,
    I extends number,
    Inferred extends T[I],
>(xs: T, _: N, ix: I, fn: (value: T[I]) => value is Inferred): xs is T & NthTuple<Inferred, N, I> {
    return fn(xs[ix])
}

type NthTuple<
    T,
    N extends number,
    I extends number,
    Acc extends unknown[] = [],
> = Acc['length'] extends N
    ? Acc
    : Acc['length'] extends I
      ? NthTuple<T, N, I, [...Acc, T]>
      : NthTuple<T, N, I, [...Acc, unknown]>

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
