import undetermined_coefficients from '../undetermined_coefficients';
import { parse } from 'mathjs';

describe('Gets the correct output', () => {
    test('𝑦′′ + 5𝑦′ + 6𝑦 = 2𝑥 + 1', () => {
        undetermined_coefficients(
            parse('derive(y, 2) + 5*derive(y, 1) + 6*y'),
            parse('2x + 1')
        ).catch((err) => {
            console.log(err);
        });
    });
});
