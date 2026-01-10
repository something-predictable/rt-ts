/* eslint-disable no-shadow */

export function isS(u: unknown) {
    return (
        typeof u === 'object' &&
        u !== null &&
        'type' in u &&
        inferObjectMember(u, 'type', u => u === 'up' || u === 'down') &&
        'n' in u &&
        inferObjectMember(u, 'n', u => typeof u === 'string') &&
        'a' in u &&
        inferObjectMember(
            u,
            'a',
            u =>
                typeof u === 'object' &&
                u !== null &&
                'x' in u &&
                inferObjectMember(u, 'x', u => typeof u === 'number') &&
                'y' in u &&
                inferObjectMember(u, 'y', u => typeof u === 'number'),
        )
    )
}
assert<{
    type: 'up' | 'down'
    n: string
    a: {
        x: number
        y: number
    }
}>(isInferredBy(isS))

export const assertIsS = makeAssertIs(isSWithErrors)
assert<{
    type: 'up' | 'down'
    n: string
    a: {
        x: number
        y: number
    }
}>(isAssertedBy(assertIsS))

export function isTOS(u: unknown) {
    return (
        Array.isArray(u) &&
        inferTupleMember(
            u,
            2,
            0,
            u =>
                typeof u === 'object' &&
                u !== null &&
                'a' in u &&
                inferObjectMember(u, 'a', u => typeof u === 'number') &&
                'b' in u &&
                inferObjectMember(
                    u,
                    'b',
                    u =>
                        typeof u === 'object' &&
                        u !== null &&
                        'n' in u &&
                        inferObjectMember(u, 'n', u => typeof u === 'string'),
                ),
        ) &&
        inferTupleMember(u, 2, 1, u => typeof u === 'string')
    )
}
assert<
    [
        {
            a: number
            b: {
                n: string
            }
        },
        string,
    ]
>(isInferredBy(isTOS))

export const assertIsTOS = makeAssertIs(isTOSWithErrors)
assert<
    [
        {
            a: number
            b: {
                n: string
            }
        },
        string,
    ]
>(isAssertedBy(assertIsTOS))

function isSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => typeof v === 'object', errors, what, 'must be an object') &&
        collect(u, v => v !== null, errors, what, 'must not be null') &&
        collect(u, v => 'type' in v, errors, what, 'must contain ' + 'type') &&
        inferObjectMember(u, 'type', function (u) {
            const es: [string[], string[]] = [[], []]
            const i =
                collect(u, v => v === 'up', es[0], memberAccess(what, 'type'), "must be 'up'") ||
                collect(u, v => v === 'down', es[1], memberAccess(what, 'type'), "must be 'down'")
            if (!i) {
                errors.push(
                    es
                        .filter(branch => branch.length !== 0)
                        .map(branch => branch.join(' and '))
                        .join(', or '),
                )
            }
            return i
        }) &&
        collect(u, v => 'n' in v, errors, what, 'must contain ' + 'n') &&
        inferObjectMember(u, 'n', u =>
            collect(
                u,
                v => typeof v === 'string',
                errors,
                memberAccess(what, 'n'),
                'must be a string',
            ),
        ) &&
        collect(u, v => 'a' in v, errors, what, 'must contain ' + 'a') &&
        inferObjectMember(
            u,
            'a',
            u =>
                collect(
                    u,
                    v => typeof v === 'object',
                    errors,
                    memberAccess(what, 'a'),
                    'must be an object',
                ) &&
                collect(u, v => v !== null, errors, memberAccess(what, 'a'), 'must not be null') &&
                collect(u, v => 'x' in v, errors, memberAccess(what, 'a'), 'must contain ' + 'x') &&
                inferObjectMember(u, 'x', u =>
                    collect(
                        u,
                        v => typeof v === 'number',
                        errors,
                        memberAccess(memberAccess(what, 'a'), 'x'),
                        'must be a number',
                    ),
                ) &&
                collect(u, v => 'y' in v, errors, memberAccess(what, 'a'), 'must contain ' + 'y') &&
                inferObjectMember(u, 'y', u =>
                    collect(
                        u,
                        v => typeof v === 'number',
                        errors,
                        memberAccess(memberAccess(what, 'a'), 'y'),
                        'must be a number',
                    ),
                ),
        )
    )
}

function isTOSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return (
        collect(u, v => Array.isArray(v), errors, what, 'must be an array') &&
        inferTupleMember(
            u,
            2,
            0,
            u =>
                collect(
                    u,
                    v => typeof v === 'object',
                    errors,
                    indexOf(what, 0),
                    'must be an object',
                ) &&
                collect(u, v => v !== null, errors, indexOf(what, 0), 'must not be null') &&
                collect(u, v => 'a' in v, errors, indexOf(what, 0), 'must contain ' + 'a') &&
                inferObjectMember(u, 'a', u =>
                    collect(
                        u,
                        v => typeof v === 'number',
                        errors,
                        memberAccess(indexOf(what, 0), 'a'),
                        'must be a number',
                    ),
                ) &&
                collect(u, v => 'b' in v, errors, indexOf(what, 0), 'must contain ' + 'b') &&
                inferObjectMember(
                    u,
                    'b',
                    u =>
                        collect(
                            u,
                            v => typeof v === 'object',
                            errors,
                            memberAccess(indexOf(what, 0), 'b'),
                            'must be an object',
                        ) &&
                        collect(
                            u,
                            v => v !== null,
                            errors,
                            memberAccess(indexOf(what, 0), 'b'),
                            'must not be null',
                        ) &&
                        collect(
                            u,
                            v => 'n' in v,
                            errors,
                            memberAccess(indexOf(what, 0), 'b'),
                            'must contain ' + 'n',
                        ) &&
                        inferObjectMember(u, 'n', u =>
                            collect(
                                u,
                                v => typeof v === 'string',
                                errors,
                                memberAccess(memberAccess(indexOf(what, 0), 'b'), 'n'),
                                'must be a string',
                            ),
                        ),
                ),
        ) &&
        inferTupleMember(u, 2, 1, u =>
            collect(u, v => typeof v === 'string', errors, indexOf(what, 1), 'must be a string'),
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
>(
    xs: T,
    _: N,
    ix: I,
    fn: (value: unknown) => value is Inferred,
): xs is T & NthTuple<Inferred, N, I> {
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
