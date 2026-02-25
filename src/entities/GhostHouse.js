export class GhostHouse {
    constructor() {
        this.globalDotCounter = 0;
        this.useGlobalCounter = false;
        
        this.timers = {
            globalResend: 0 // If pacman stops eating for a while
        };
        
        // Ghost references are assigned when created
    }

    // A full ghost house implementation involves tracking dot counters for Pinky, Inky, Clyde.
    // For now we will allow direct state manipulation for phase 3 testing.
}
