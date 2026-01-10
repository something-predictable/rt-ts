export type S = {
    type: 'up' | 'down'
    n: string
    a: {
        x: number
        y: number
    }
}

export type TOS = [
    {
        a: number
        b: {
            n: string
        }
    },
    string,
]
