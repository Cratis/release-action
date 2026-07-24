import 'chai';

// The Cratis spec conventions assert through chai's fluent `.should` interface, but `@types/chai` no longer
// augments `Object` with it - so the augmentation is declared here, for specs only.
declare global {
    interface Object {
        should: Chai.Assertion;
    }
}
