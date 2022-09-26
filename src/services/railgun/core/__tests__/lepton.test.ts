import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { initTestLepton } from '../../../../test/setup.test';
import { closeRailgunEngine, getEngine } from '../engine';
import { getProver } from '../prover';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('engine', () => {
  beforeEach(() => {
    initTestLepton();
  });

  it('Should get active engine instance', () => {
    expect(getEngine()).to.not.be.undefined;
  });

  it('Should fail without active engine instance', () => {
    closeRailgunEngine();
    expect(() => getEngine()).to.throw('RAILGUN Engine not yet initialized.');
    expect(() => getProver()).to.throw('RAILGUN Engine not yet initialized.');
  });
});
