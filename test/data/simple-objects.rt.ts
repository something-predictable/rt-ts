/* eslint-disable no-shadow */

export function isO(u: unknown) {
    return typeof u === 'object' && u !== null
}
assert<{}>(isInferredBy(isO))

export const assertIsO = makeAssertIs(isOWithErrors)
assert<{}>(isAssertedBy(assertIsO))

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

export const assertIsOSN = makeAssertIs(isOSNWithErrors)
assert<{
    a: string
    b: number
}>(isAssertedBy(assertIsOSN))

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

export const assertIsOSS = makeAssertIs(isOSSWithErrors)
assert<{
    a: string
    b: string
}>(isAssertedBy(assertIsOSS))

export function isT(u: unknown) {
    return Array.isArray(u) && isEmptyTuple(u)
}
assert<[]>(isInferredBy(isT))

export const assertIsT = makeAssertIs(isTWithErrors)
assert<[]>(isAssertedBy(assertIsT))

export function isTS(u: unknown) {
    return Array.isArray(u) && inferTupleMember(u, 1, 0, u => typeof u === 'string')
}
assert<[string]>(isInferredBy(isTS))

export const assertIsTS = makeAssertIs(isTSWithErrors)
assert<[string]>(isAssertedBy(assertIsTS))

export function isTSS(u: unknown) {
    return (
        Array.isArray(u) &&
        inferTupleMember(u, 2, 0, u => typeof u === 'string') &&
        inferTupleMember(u, 2, 1, u => typeof u === 'string')
    )
}
assert<[string, string]>(isInferredBy(isTSS))

export const assertIsTSS = makeAssertIs(isTSSWithErrors)
assert<[string, string]>(isAssertedBy(assertIsTSS))

export function isTSN(u: unknown) {
    return (
        Array.isArray(u) &&
        inferTupleMember(u, 2, 0, u => typeof u === 'string') &&
        inferTupleMember(u, 2, 1, u => typeof u === 'number')
    )
}
assert<[string, number]>(isInferredBy(isTSN))

export const assertIsTSN = makeAssertIs(isTSNWithErrors)
assert<[string, number]>(isAssertedBy(assertIsTSN))

function isOWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => typeof v === 'object', errors, what, 'must be an object') &&
        collect(u, v => v !== null, errors, what, 'must not be null')
    )
}

function isOSNWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => typeof v === 'object', errors, what, 'must be an object') &&
        collect(u, v => v !== null, errors, what, 'must not be null') &&
        collect(u, v => 'a' in v, errors, what, 'must contain ' + 'a') &&
        inferObjectMember(u, 'a', u =>
            collect(
                u,
                v => typeof v === 'string',
                errors,
                memberAccess(what, 'a'),
                'must be a string',
            ),
        ) &&
        collect(u, v => 'b' in v, errors, what, 'must contain ' + 'b') &&
        inferObjectMember(u, 'b', u =>
            collect(
                u,
                v => typeof v === 'number',
                errors,
                memberAccess(what, 'b'),
                'must be a number',
            ),
        )
    )
}

function isOSSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => typeof v === 'object', errors, what, 'must be an object') &&
        collect(u, v => v !== null, errors, what, 'must not be null') &&
        collect(u, v => 'a' in v, errors, what, 'must contain ' + 'a') &&
        inferObjectMember(u, 'a', u =>
            collect(
                u,
                v => typeof v === 'string',
                errors,
                memberAccess(what, 'a'),
                'must be a string',
            ),
        ) &&
        collect(u, v => 'b' in v, errors, what, 'must contain ' + 'b') &&
        inferObjectMember(u, 'b', u =>
            collect(
                u,
                v => typeof v === 'string',
                errors,
                memberAccess(what, 'b'),
                'must be a string',
            ),
        )
    )
}

function isTWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => Array.isArray(v), errors, what, 'must be an array') &&
        collect(u, v => isEmptyTuple(v), errors, what, 'must be empty')
    )
}

function isTSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => Array.isArray(v), errors, what, 'must be an array') &&
        inferTupleMember(u, 1, 0, u =>
            collect(u, v => typeof v === 'string', errors, indexOf(what, 0), 'must be a string'),
        )
    )
}

function isTSSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => Array.isArray(v), errors, what, 'must be an array') &&
        inferTupleMember(u, 2, 0, u =>
            collect(u, v => typeof v === 'string', errors, indexOf(what, 0), 'must be a string'),
        ) &&
        inferTupleMember(u, 2, 1, u =>
            collect(u, v => typeof v === 'string', errors, indexOf(what, 1), 'must be a string'),
        )
    )
}

function isTSNWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => Array.isArray(v), errors, what, 'must be an array') &&
        inferTupleMember(u, 2, 0, u =>
            collect(u, v => typeof v === 'string', errors, indexOf(what, 0), 'must be a string'),
        ) &&
        inferTupleMember(u, 2, 1, u =>
            collect(u, v => typeof v === 'number', errors, indexOf(what, 1), 'must be a number'),
        )
    )
}

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

function makeAssertIs<T>(
    infer: (u: unknown, what: string | undefined, errors: string[]) => u is T,
): (u: unknown, what?: string, error?: (issues: string[]) => Error) => asserts u is T {
    return (u: unknown, what: string | undefined, error?: (issues: string[]) => Error) => {
        const issues: string[] = []
        if (!infer(u, what, issues)) {
            if (error) {
                throw error(issues)
            }
            const [first] = issues
            if (!first) {
                throw new Error('runtime type check')
            }
            throw Object.assign(new TypeError(first), { issues })
        }
    }
}

function collect<I, T extends I>(
    u: I,
    infer: (u: I) => u is T,
    errors: string[],
    what: string | undefined,
    error: string,
) {
    const i = infer(u)
    if (!i) {
        if (what) {
            errors.push(`${what} ${error}`)
        } else {
            errors.push(error)
        }
    }
    return i
}

function memberAccess(what: string | undefined, member: string) {
    if (what) {
        return `${what}.${member}`
    }
    return member
}

function indexOf(what: string | undefined, ix: number) {
    return `${what ?? ''}[${ix}]`
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

function isAssertedBy<T>(
    _: (u: unknown, what: string | undefined, error: (issues: string[]) => Error) => asserts u is T,
) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
