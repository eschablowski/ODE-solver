import { MathNode } from 'mathjs';
import undeterminedCoefficients from './undetermined_coefficients';
import { isConstant } from './utils';

/**
 * @description Checks wheter a function has a finite amount of independent variables.
 * @param func The function to check
 * @returns Whether the function has finitely many independent derivatives
 */
function derivable(func: MathNode): boolean {
    switch (func.type) {
        case 'OperatorNode':
        case 'FunctionNode':
            if (
                [
                    'tan',
                    'cot',
                    'asin',
                    'acos',
                    'atan',
                    'acot',
                    'asec',
                    'acsc',
                    'log',
                    'divide',
                    'pow',
                ].includes(func.fn) &&
                !isConstant(func.args[func.args.length - 1])
            )
                return false;
            for (const part of func.args) if (!derivable(part)) return false;
            return true;
        case 'ParenthesisNode':
            return derivable(func.args[0]);
        case 'ConstantNode':
        case 'SymbolNode':
            return true;
        default:
            return false;
    }
}

/**
 * Calculate the particular solution to an nonhomogenious ODE.
 * @param equation The Ordinary Differential Equation
 * @param independentVariable The independent variable.
 * @returns The particular solution to `equation`.
 */
export default async function y_p(
    equation: MathNode,
    independentVariable: string
): Promise<MathNode> {
    if (!equation.isConditionalnode) throw new Error('Not an equation');
    if (derivable(equation.args[0]))
        return undeterminedCoefficients(
            equation.args[0],
            equation.args[1],
            independentVariable
        );
}
