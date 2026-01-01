import {
    NodeFlags,
    SyntaxKind,
    type ArrowFunction,
    type Expression,
    type Identifier,
    type NodeFactory,
    type NumericLiteral,
    type StringLiteral,
} from 'typescript'

export class Library {
    readonly #factory
    readonly #inferObjectMember
    #inferObjectMemberUsed = false
    readonly #inferTupleMember
    #inferTupleMemberUsed = false
    readonly #isEmptyTuple
    #isEmptyTupleUsed = false
    readonly #makeAssertIs
    #makeAssertIsUsed = false
    readonly #collect
    #collectUsed = false
    readonly #dot
    #dotUsed = false
    readonly #indexOf
    #indexOfUsed = false

    constructor(factory: NodeFactory) {
        this.#factory = factory
        this.#inferObjectMember = factory.createIdentifier('inferObjectMember')
        this.#inferTupleMember = factory.createIdentifier('inferTupleMember')
        this.#isEmptyTuple = factory.createIdentifier('isEmptyTuple')
        this.#makeAssertIs = factory.createIdentifier('makeAssertIs')
        this.#collect = factory.createIdentifier('collect')
        this.#dot = factory.createIdentifier('memberAccess')
        this.#indexOf = factory.createIdentifier('indexOf')
    }

    inferObjectMember(obj: Identifier, member: StringLiteral, inferrer: ArrowFunction) {
        this.#inferObjectMemberUsed = true
        return this.#factory.createCallExpression(this.#inferObjectMember, undefined, [
            obj,
            member,
            inferrer,
        ])
    }

    inferTupleMember(
        xs: Identifier,
        length: NumericLiteral,
        index: NumericLiteral,
        inferrer: ArrowFunction,
    ) {
        this.#inferTupleMemberUsed = true
        return this.#factory.createCallExpression(this.#inferTupleMember, undefined, [
            xs,
            length,
            index,
            inferrer,
        ])
    }

    isEmptyTuple(xs: Identifier) {
        this.#isEmptyTupleUsed = true
        return this.#factory.createCallExpression(this.#isEmptyTuple, undefined, [xs])
    }

    makeAssertIs(xs: Identifier) {
        this.#makeAssertIsUsed = true
        return this.#factory.createCallExpression(this.#makeAssertIs, undefined, [xs])
    }

    collect(
        u: Identifier,
        inferrer: ArrowFunction,
        errors: Identifier,
        what: Expression,
        error: Expression,
    ) {
        this.#collectUsed = true
        return this.#factory.createCallExpression(this.#collect, undefined, [
            u,
            inferrer,
            errors,
            what,
            error,
        ])
    }

    memberAccess(what: Expression, member: StringLiteral) {
        this.#dotUsed = true
        return this.#factory.createCallExpression(this.#dot, undefined, [what, member])
    }

    indexOf(what: Expression, ix: NumericLiteral) {
        this.#indexOfUsed = true
        return this.#factory.createCallExpression(this.#indexOf, undefined, [what, ix])
    }

    *nodes() {
        if (this.#inferObjectMemberUsed) {
            yield createInferMember(this.#factory, this.#inferObjectMember)
        }
        if (this.#inferTupleMemberUsed) {
            yield* createInferTupleMember(this.#factory, this.#inferTupleMember)
        }
        if (this.#isEmptyTupleUsed) {
            yield createEmptyTupleMember(this.#factory, this.#isEmptyTuple)
        }
        if (this.#makeAssertIsUsed) {
            yield createMakeAssertIs(this.#factory, this.#makeAssertIs)
        }
        if (this.#collectUsed) {
            yield createCollect(this.#factory, this.#collect)
        }
        if (this.#dotUsed) {
            yield createMemberAccess(this.#factory, this.#dot)
        }
        if (this.#indexOfUsed) {
            yield createIndexOf(this.#factory, this.#indexOf)
        }
    }
}

// https://ts-ast-viewer.com/

function createInferMember(factory: NodeFactory, identifier: Identifier) {
    // function inferObjectMember<
    //     K extends PropertyKey,
    //     T extends {
    //         [P in K]: unknown
    //     },
    //     Inferred extends T[K],
    // >(
    //     obj: T,
    //     key: K,
    //     fn: (value: T[K]) => value is Inferred,
    // ): obj is T & {
    //     [P in K]: Inferred
    // } {
    //     return fn(obj[key])
    // }

    const k = factory.createIdentifier('K')
    const t = factory.createIdentifier('T')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        [
            factory.createTypeParameterDeclaration(
                undefined,
                k,
                factory.createTypeReferenceNode(factory.createIdentifier('PropertyKey'), undefined),
                undefined,
            ),
            factory.createTypeParameterDeclaration(
                undefined,
                t,
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        undefined,
                        factory.createIdentifier('P'),
                        factory.createTypeReferenceNode(k, undefined),
                        undefined,
                    ),
                    undefined,
                    undefined,
                    factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    undefined,
                ),
                undefined,
            ),
            factory.createTypeParameterDeclaration(
                undefined,
                factory.createIdentifier('Inferred'),
                factory.createIndexedAccessTypeNode(
                    factory.createTypeReferenceNode(t, undefined),
                    factory.createTypeReferenceNode(k, undefined),
                ),
                undefined,
            ),
        ],
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('obj'),
                undefined,
                factory.createTypeReferenceNode(t, undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('key'),
                undefined,
                factory.createTypeReferenceNode(k, undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('fn'),
                undefined,
                factory.createFunctionTypeNode(
                    undefined,
                    [
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('value'),
                            undefined,
                            factory.createIndexedAccessTypeNode(
                                factory.createTypeReferenceNode(t, undefined),
                                factory.createTypeReferenceNode(k, undefined),
                            ),
                            undefined,
                        ),
                    ],
                    factory.createTypePredicateNode(
                        undefined,
                        factory.createIdentifier('value'),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Inferred'),
                            undefined,
                        ),
                    ),
                ),
                undefined,
            ),
        ],
        factory.createTypePredicateNode(
            undefined,
            factory.createIdentifier('obj'),
            factory.createIntersectionTypeNode([
                factory.createTypeReferenceNode(t, undefined),
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        undefined,
                        factory.createIdentifier('P'),
                        factory.createTypeReferenceNode(k, undefined),
                        undefined,
                    ),
                    undefined,
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier('Inferred'),
                        undefined,
                    ),
                    undefined,
                ),
            ]),
        ),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createCallExpression(factory.createIdentifier('fn'), undefined, [
                        factory.createElementAccessExpression(
                            factory.createIdentifier('obj'),
                            factory.createIdentifier('key'),
                        ),
                    ]),
                ),
            ],
            true,
        ),
    )
}

function createInferTupleMember(factory: NodeFactory, identifier: Identifier) {
    // function inferTupleMember<
    //     T extends unknown[],
    //     N extends number,
    //     I extends number,
    //     Inferred extends T[I],
    // >(xs: T, _: N, ix: I, fn: (value: T[I]) => value is Inferred): xs is T & NthTuple<Inferred, N, I> {
    //     return fn(xs[ix])
    // }

    // type NthTuple<
    //     T,
    //     N extends number,
    //     I extends number,
    //     Acc extends unknown[] = [],
    // > = Acc['length'] extends N
    //     ? Acc
    //     : Acc['length'] extends I
    //       ? NthTuple<T, N, I, [...Acc, T]>
    //       : NthTuple<T, N, I, [...Acc, unknown]>

    const t = factory.createIdentifier('T')
    const n = factory.createIdentifier('N')
    const i = factory.createIdentifier('I')
    return [
        factory.createFunctionDeclaration(
            undefined,
            undefined,
            identifier,
            [
                factory.createTypeParameterDeclaration(
                    undefined,
                    t,
                    factory.createArrayTypeNode(
                        factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    ),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    n,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    i,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier('Inferred'),
                    factory.createIndexedAccessTypeNode(
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                    ),
                    undefined,
                ),
            ],
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('xs'),
                    undefined,
                    factory.createTypeReferenceNode(t, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('_'),
                    undefined,
                    factory.createTypeReferenceNode(n, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('ix'),
                    undefined,
                    factory.createTypeReferenceNode(i, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('fn'),
                    undefined,
                    factory.createFunctionTypeNode(
                        undefined,
                        [
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('value'),
                                undefined,
                                factory.createIndexedAccessTypeNode(
                                    factory.createTypeReferenceNode(t, undefined),
                                    factory.createTypeReferenceNode(i, undefined),
                                ),
                                undefined,
                            ),
                        ],
                        factory.createTypePredicateNode(
                            undefined,
                            factory.createIdentifier('value'),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('Inferred'),
                                undefined,
                            ),
                        ),
                    ),
                    undefined,
                ),
            ],
            factory.createTypePredicateNode(
                undefined,
                factory.createIdentifier('xs'),
                factory.createIntersectionTypeNode([
                    factory.createTypeReferenceNode(t, undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Inferred'),
                            undefined,
                        ),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                    ]),
                ]),
            ),
            factory.createBlock(
                [
                    factory.createReturnStatement(
                        factory.createCallExpression(factory.createIdentifier('fn'), undefined, [
                            factory.createElementAccessExpression(
                                factory.createIdentifier('xs'),
                                factory.createIdentifier('ix'),
                            ),
                        ]),
                    ),
                ],
                true,
            ),
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            factory.createIdentifier('NthTuple'),
            [
                factory.createTypeParameterDeclaration(undefined, t, undefined, undefined),
                factory.createTypeParameterDeclaration(
                    undefined,
                    n,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    i,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier('Acc'),
                    factory.createArrayTypeNode(
                        factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    ),
                    factory.createTupleTypeNode([]),
                ),
            ],
            factory.createConditionalTypeNode(
                factory.createIndexedAccessTypeNode(
                    factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                    factory.createLiteralTypeNode(factory.createStringLiteral('length')),
                ),
                factory.createTypeReferenceNode(n, undefined),
                factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                factory.createConditionalTypeNode(
                    factory.createIndexedAccessTypeNode(
                        factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                        factory.createLiteralTypeNode(factory.createStringLiteral('length')),
                    ),
                    factory.createTypeReferenceNode(i, undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                        factory.createTupleTypeNode([
                            factory.createRestTypeNode(
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('Acc'),
                                    undefined,
                                ),
                            ),
                            factory.createTypeReferenceNode(t, undefined),
                        ]),
                    ]),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                        factory.createTupleTypeNode([
                            factory.createRestTypeNode(
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('Acc'),
                                    undefined,
                                ),
                            ),
                            factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                        ]),
                    ]),
                ),
            ),
        ),
    ]
}

function createEmptyTupleMember(factory: NodeFactory, identifier: Identifier) {
    // function isEmptyTuple(xs: unknown[]): xs is [] {
    //     return xs.length === 0
    // }

    const xs = factory.createIdentifier('xs')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        undefined,
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                xs,
                undefined,
                factory.createArrayTypeNode(
                    factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                ),
                undefined,
            ),
        ],
        factory.createTypePredicateNode(undefined, xs, factory.createTupleTypeNode([])),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createBinaryExpression(
                        factory.createPropertyAccessExpression(
                            xs,
                            factory.createIdentifier('length'),
                        ),
                        factory.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                        factory.createNumericLiteral('0'),
                    ),
                ),
            ],
            true,
        ),
    )
}

function createMakeAssertIs(factory: NodeFactory, identifier: Identifier) {
    // function makeAssertIs<T>(
    //     infer: (u: unknown, what: string | undefined, errors: string[]) => u is T,
    // ): (u: unknown, what?: string, error?: (issues: string[]) => Error) => asserts u is T {
    //     return (u: unknown, what: string | undefined, error?: (issues: string[]) => Error) => {
    //         const issues: string[] = []
    //         if (!infer(u, what, issues)) {
    //             if (error) {
    //                 throw error(issues)
    //             }
    //             const [first] = issues
    //             if (!first) {
    //                 throw new Error('runtime type check')
    //             }
    //             throw Object.assign(new TypeError(first), { issues })
    //         }
    //     }
    // }

    const t = factory.createIdentifier('T')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        [factory.createTypeParameterDeclaration(undefined, t, undefined, undefined)],
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('infer'),
                undefined,
                factory.createFunctionTypeNode(
                    undefined,
                    [
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('u'),
                            undefined,
                            factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                            undefined,
                        ),
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('what'),
                            undefined,
                            factory.createUnionTypeNode([
                                factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                                factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
                            ]),
                            undefined,
                        ),
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('errors'),
                            undefined,
                            factory.createArrayTypeNode(
                                factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                            ),
                            undefined,
                        ),
                    ],
                    factory.createTypePredicateNode(
                        undefined,
                        factory.createIdentifier('u'),
                        factory.createTypeReferenceNode(t, undefined),
                    ),
                ),
                undefined,
            ),
        ],
        factory.createFunctionTypeNode(
            undefined,
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('u'),
                    undefined,
                    factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('what'),
                    factory.createToken(SyntaxKind.QuestionToken),
                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('error'),
                    factory.createToken(SyntaxKind.QuestionToken),
                    factory.createFunctionTypeNode(
                        undefined,
                        [
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('issues'),
                                undefined,
                                factory.createArrayTypeNode(
                                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                                ),
                                undefined,
                            ),
                        ],
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Error'),
                            undefined,
                        ),
                    ),
                    undefined,
                ),
            ],
            factory.createTypePredicateNode(
                factory.createToken(SyntaxKind.AssertsKeyword),
                factory.createIdentifier('u'),
                factory.createTypeReferenceNode(t, undefined),
            ),
        ),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('u'),
                                undefined,
                                factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                                undefined,
                            ),
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('what'),
                                undefined,
                                factory.createUnionTypeNode([
                                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
                                ]),
                                undefined,
                            ),
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('error'),
                                factory.createToken(SyntaxKind.QuestionToken),
                                factory.createFunctionTypeNode(
                                    undefined,
                                    [
                                        factory.createParameterDeclaration(
                                            undefined,
                                            undefined,
                                            factory.createIdentifier('issues'),
                                            undefined,
                                            factory.createArrayTypeNode(
                                                factory.createKeywordTypeNode(
                                                    SyntaxKind.StringKeyword,
                                                ),
                                            ),
                                            undefined,
                                        ),
                                    ],
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier('Error'),
                                        undefined,
                                    ),
                                ),
                                undefined,
                            ),
                        ],
                        undefined,
                        factory.createToken(SyntaxKind.EqualsGreaterThanToken),
                        factory.createBlock(
                            [
                                factory.createVariableStatement(
                                    undefined,
                                    factory.createVariableDeclarationList(
                                        [
                                            factory.createVariableDeclaration(
                                                factory.createIdentifier('issues'),
                                                undefined,
                                                factory.createArrayTypeNode(
                                                    factory.createKeywordTypeNode(
                                                        SyntaxKind.StringKeyword,
                                                    ),
                                                ),
                                                factory.createArrayLiteralExpression([], false),
                                            ),
                                        ],
                                        NodeFlags.Const,
                                    ),
                                ),
                                factory.createIfStatement(
                                    factory.createPrefixUnaryExpression(
                                        SyntaxKind.ExclamationToken,
                                        factory.createCallExpression(
                                            factory.createIdentifier('infer'),
                                            undefined,
                                            [
                                                factory.createIdentifier('u'),
                                                factory.createIdentifier('what'),
                                                factory.createIdentifier('issues'),
                                            ],
                                        ),
                                    ),
                                    factory.createBlock(
                                        [
                                            factory.createIfStatement(
                                                factory.createIdentifier('error'),
                                                factory.createBlock(
                                                    [
                                                        factory.createThrowStatement(
                                                            factory.createCallExpression(
                                                                factory.createIdentifier('error'),
                                                                undefined,
                                                                [
                                                                    factory.createIdentifier(
                                                                        'issues',
                                                                    ),
                                                                ],
                                                            ),
                                                        ),
                                                    ],
                                                    true,
                                                ),
                                                undefined,
                                            ),
                                            factory.createVariableStatement(
                                                undefined,
                                                factory.createVariableDeclarationList(
                                                    [
                                                        factory.createVariableDeclaration(
                                                            factory.createArrayBindingPattern([
                                                                factory.createBindingElement(
                                                                    undefined,
                                                                    undefined,
                                                                    factory.createIdentifier(
                                                                        'first',
                                                                    ),
                                                                    undefined,
                                                                ),
                                                            ]),
                                                            undefined,
                                                            undefined,
                                                            factory.createIdentifier('issues'),
                                                        ),
                                                    ],
                                                    NodeFlags.Const,
                                                ),
                                            ),
                                            factory.createIfStatement(
                                                factory.createPrefixUnaryExpression(
                                                    SyntaxKind.ExclamationToken,
                                                    factory.createIdentifier('first'),
                                                ),
                                                factory.createBlock(
                                                    [
                                                        factory.createThrowStatement(
                                                            factory.createNewExpression(
                                                                factory.createIdentifier('Error'),
                                                                undefined,
                                                                [
                                                                    factory.createStringLiteral(
                                                                        'runtime type check',
                                                                    ),
                                                                ],
                                                            ),
                                                        ),
                                                    ],
                                                    true,
                                                ),
                                                undefined,
                                            ),
                                            factory.createThrowStatement(
                                                factory.createCallExpression(
                                                    factory.createPropertyAccessExpression(
                                                        factory.createIdentifier('Object'),
                                                        factory.createIdentifier('assign'),
                                                    ),
                                                    undefined,
                                                    [
                                                        factory.createNewExpression(
                                                            factory.createIdentifier('TypeError'),
                                                            undefined,
                                                            [factory.createIdentifier('first')],
                                                        ),
                                                        factory.createObjectLiteralExpression(
                                                            [
                                                                factory.createShorthandPropertyAssignment(
                                                                    factory.createIdentifier(
                                                                        'issues',
                                                                    ),
                                                                    undefined,
                                                                ),
                                                            ],
                                                            false,
                                                        ),
                                                    ],
                                                ),
                                            ),
                                        ],
                                        true,
                                    ),
                                    undefined,
                                ),
                            ],
                            true,
                        ),
                    ),
                ),
            ],
            true,
        ),
    )
}

function createCollect(factory: NodeFactory, identifier: Identifier) {
    // function collect<I, T extends I>(
    //     u: I,
    //     infer: (u: I) => u is T,
    //     errors: string[],
    //     what: string | undefined,
    //     error: string,
    // ) {
    //     const i = infer(u)
    //     if (!i) {
    //         if (what) {
    //             errors.push(`${what} ${error}`)
    //         } else {
    //             errors.push(error)
    //         }
    //     }
    //     return i
    // }

    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        [
            factory.createTypeParameterDeclaration(
                undefined,
                factory.createIdentifier('I'),
                undefined,
                undefined,
            ),
            factory.createTypeParameterDeclaration(
                undefined,
                factory.createIdentifier('T'),
                factory.createTypeReferenceNode(factory.createIdentifier('I'), undefined),
                undefined,
            ),
        ],
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('u'),
                undefined,
                factory.createTypeReferenceNode(factory.createIdentifier('I'), undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('infer'),
                undefined,
                factory.createFunctionTypeNode(
                    undefined,
                    [
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('u'),
                            undefined,
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('I'),
                                undefined,
                            ),
                            undefined,
                        ),
                    ],
                    factory.createTypePredicateNode(
                        undefined,
                        factory.createIdentifier('u'),
                        factory.createTypeReferenceNode(factory.createIdentifier('T'), undefined),
                    ),
                ),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('errors'),
                undefined,
                factory.createArrayTypeNode(
                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                ),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('what'),
                undefined,
                factory.createUnionTypeNode([
                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
                ]),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('error'),
                undefined,
                factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                undefined,
            ),
        ],
        undefined,
        factory.createBlock(
            [
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                        [
                            factory.createVariableDeclaration(
                                factory.createIdentifier('i'),
                                undefined,
                                undefined,
                                factory.createCallExpression(
                                    factory.createIdentifier('infer'),
                                    undefined,
                                    [factory.createIdentifier('u')],
                                ),
                            ),
                        ],
                        NodeFlags.Const,
                    ),
                ),
                factory.createIfStatement(
                    factory.createPrefixUnaryExpression(
                        SyntaxKind.ExclamationToken,
                        factory.createIdentifier('i'),
                    ),
                    factory.createBlock(
                        [
                            factory.createIfStatement(
                                factory.createIdentifier('what'),
                                factory.createBlock(
                                    [
                                        factory.createExpressionStatement(
                                            factory.createCallExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier('errors'),
                                                    factory.createIdentifier('push'),
                                                ),
                                                undefined,
                                                [
                                                    factory.createTemplateExpression(
                                                        factory.createTemplateHead('', ''),
                                                        [
                                                            factory.createTemplateSpan(
                                                                factory.createIdentifier('what'),
                                                                factory.createTemplateMiddle(
                                                                    ' ',
                                                                    ' ',
                                                                ),
                                                            ),
                                                            factory.createTemplateSpan(
                                                                factory.createIdentifier('error'),
                                                                factory.createTemplateTail('', ''),
                                                            ),
                                                        ],
                                                    ),
                                                ],
                                            ),
                                        ),
                                    ],
                                    true,
                                ),
                                factory.createBlock(
                                    [
                                        factory.createExpressionStatement(
                                            factory.createCallExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier('errors'),
                                                    factory.createIdentifier('push'),
                                                ),
                                                undefined,
                                                [factory.createIdentifier('error')],
                                            ),
                                        ),
                                    ],
                                    true,
                                ),
                            ),
                        ],
                        true,
                    ),
                    undefined,
                ),
                factory.createReturnStatement(factory.createIdentifier('i')),
            ],
            true,
        ),
    )
}

function createMemberAccess(factory: NodeFactory, identifier: Identifier) {
    // function dot(what: string | undefined, member: string) {
    //     if (what) {
    //         return `${what}.${member}`
    //     }
    //     return member
    // }

    const member = factory.createIdentifier('member')
    const what = factory.createIdentifier('what')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        undefined,
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                what,
                undefined,
                factory.createUnionTypeNode([
                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
                ]),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                member,
                undefined,
                factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                undefined,
            ),
        ],
        undefined,
        factory.createBlock(
            [
                factory.createIfStatement(
                    what,
                    factory.createBlock(
                        [
                            factory.createReturnStatement(
                                factory.createTemplateExpression(
                                    factory.createTemplateHead('', ''),
                                    [
                                        factory.createTemplateSpan(
                                            what,
                                            factory.createTemplateMiddle('.', '.'),
                                        ),
                                        factory.createTemplateSpan(
                                            member,
                                            factory.createTemplateTail('', ''),
                                        ),
                                    ],
                                ),
                            ),
                        ],
                        true,
                    ),
                    undefined,
                ),
                factory.createReturnStatement(member),
            ],
            true,
        ),
    )
}

function createIndexOf(factory: NodeFactory, identifier: Identifier) {
    // function indexOf(what: string | undefined, ix: number) {
    //     return `${what ?? ''}[${ix}]`
    // }

    const what = factory.createIdentifier('what')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        undefined,
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                what,
                undefined,
                factory.createUnionTypeNode([
                    factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
                ]),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('ix'),
                undefined,
                factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                undefined,
            ),
        ],
        undefined,
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createTemplateExpression(factory.createTemplateHead('', ''), [
                        factory.createTemplateSpan(
                            factory.createBinaryExpression(
                                what,
                                factory.createToken(SyntaxKind.QuestionQuestionToken),
                                factory.createStringLiteral(''),
                            ),
                            factory.createTemplateMiddle('[', '['),
                        ),
                        factory.createTemplateSpan(
                            factory.createIdentifier('ix'),
                            factory.createTemplateTail(']', ']'),
                        ),
                    ]),
                ),
            ],
            true,
        ),
    )
}
