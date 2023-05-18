pragma solidity ^0.8.15;

contract ContractA {
    uint private counterA;
    uint private counterB;

    constructor() public {
        counterA = 0;
        counterB = 0;
    }

    function incrementA(uint256 incrementValue) external returns (bool) {
        counterA += incrementValue;
        return true;
    }

    function incrementBoth(
        uint256 incrementValueA,
        uint256 incrementValueB
    ) external returns (bool) {
        counterA += incrementValueA;
        counterB += incrementValueB;
        return true;
    }

    function getCounterA() public view returns (uint) {
        return counterA;
    }

    function getCounterB() public view returns (uint) {
        return counterB;
    }

    function getSelectorIncrement() public view returns (bytes4) {
        return this.incrementA.selector;
    }

    function getSelectorIncrementBoth() public view returns (bytes4) {
        return this.incrementBoth.selector;
    }
}
