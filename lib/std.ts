import { SyntaxKind, type Identifier, type NodeFactory } from 'typescript'

export class Library {
    readonly #factory
    readonly #isEmptyTuple
    #isEmptyTupleUsed = false

    constructor(factory: NodeFactory) {
        this.#factory = factory
        this.#isEmptyTuple = factory.createIdentifier('isEmptyTuple')
    }

    isEmptyTuple(xs: Identifier) {
        this.#isEmptyTupleUsed = true
        return this.#factory.createCallExpression(this.#isEmptyTuple, undefined, [xs])
    }

    *nodes() {
        if (this.#isEmptyTupleUsed) {
            yield createEmptyTupleMember(this.#factory, this.#isEmptyTuple)
        }
    }
}

// https://ts-ast-viewer.com/

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
