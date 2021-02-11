const chipdisplay = require("./chip8display");

var Chip8 = function(){
    this.display = new Array(64 * 32); // Scale Up When Rendered To Canvas
    this.drawflag = false;

    var memry = new ArrayBuffer(0x1000);
    
    this.memory = new Uint8Array(memry);
    this.v = new Array(16);
    this.i = null;
    this.pc = 0x200;
    
    this.stack = new Array(16);
    this.stackPointer = 0;
    
    this.delayTimer = 0;
    this.soundTimer = 0;
    
    this.key = new Array(16);
    this.keymap = {
        "Digit1":0x1, // PC 1 -> C8 1
        "Digit2":0x2, // PC 2 -> C8 2
        "Digit3":0x3, // PC 3 -> C8 3
        "Digit4":0xC, // PC 4 -> C8 C
        "KeyQ":0x4, // PC Q -> C8 4
        "KeyW":0x5, // PC W -> C8 5
        "KeyE":0x6, // PC E -> C8 6
        "KeyR":0xD, // PC R -> C8 D
        "KeyA":0x7, // PC A -> C8 7
        "KeyS":0x8, // PC S -> C8 8
        "KeyD":0x9, // PC D -> C8 9
        "KeyF":0xE, // PC F -> C8 E
        "KeyZ":0xA, // PC Z -> C8 A
        "KeyX":0x0, // PC X -> C8 0
        "KeyC":0xB, // PC C -> C8 B
        "KeyV":0xF  // PC V -> C8 F
    };

    this.renderer = null;

    this.isRunning = true;

    this.loadFontset();
    this.mapKeys();

};
    

Chip8.prototype = {

    mapKeys : function(){

        for (i = 0 ; i < this.key.length ; i++) { this.key[i]=0; }

        var me = this.keymap;
        var mekey = this.key;

        window.onkeydown = function (ev) {
            var pressedKey = ev.code;

            if(pressedKey in me) {
                mekey[me[pressedKey]] = 1;
                //console.log("Keydown: "+pressedKey)
            }
        };

        window.onkeyup = function (ev) {
            var releasedKey = ev.code;

            if(releasedKey in me) {
                mekey[me[releasedKey]] = 0;
                //console.log("Keyup: "+releasedKey)
            }
        };

        window.onblur = function() {
            mekey[0x0] = 0;
            mekey[0x1] = 0;
            mekey[0x2] = 0;
            mekey[0x3] = 0;
            mekey[0x4] = 0;
            mekey[0x5] = 0;
            mekey[0x6] = 0;
            mekey[0x7] = 0;
            mekey[0x8] = 0;
            mekey[0x9] = 0;
            mekey[0xA] = 0;
            mekey[0xB] = 0;
            mekey[0xC] = 0;
            mekey[0xD] = 0;
            mekey[0xE] = 0;
            mekey[0xF] = 0;
        };
    },

    renderDis : function(){
        if(this.drawflag == true && this.renderer != null){
            this.renderer.renderScreen(this.display);
            this.drawflag = false;
        }
    },

    run : function(){

        if(this.soundTimer > 0){
            this.soundTimer--;
        }

        if(this.delayTimer > 0){
            this.delayTimer--;
        }
        //fetch opcode
        var opcode = this.memory[this.pc] << 8 | this.memory[this.pc + 1];
        
        console.log(opcode.toString(16).toUpperCase() + ": ");

        //decode opcode
        switch(opcode & 0xF000){

            case 0x0000:{
                switch(opcode & 0x00FF){
                    case 0x00E0:
                        this.renderer.clearScreen();
                        this.drawflag = true;
                        this.pc += 2;
                        break;
                    case 0x00EE:
                        this.stackPointer--;
                        this.pc = this.stack[this.stackPointer] + 2;
                        console.log("Returning to: " + this.pc.toString(16).toUpperCase())
                        break;
                    default:
                        console.error("Error: Unsupported Opcode!");
                        this.isRunning = false;
                        break;
                }
                break;
            }

            case 0x1000:{
                this.pc = opcode & 0x0FFF;
                break;
            } //1NNN: Jumps to address NNN
            
            case 0x2000:{
                 //2NNN: Calls subroutine at NNN
                 this.stack[this.stackPointer] = this.pc;
                 this.stackPointer++;
                 this.pc = opcode & 0x0FFF;
                 console.log("Calling " + this.pc.toString(16).toUpperCase() + " from " + this.stack[this.stackPointer - 1].toString(16).toUpperCase())
                 break;
            }
            
            case 0x3000:{
                var x = (opcode & 0x0F00) >> 8;
                if(this.v[x] == (opcode & 0x0FF)){
                    this.pc += 4;
                } else{
                    this.pc += 2;
                }
                break;
            } //3X99: Skips the next instruction if VC == NN

            case 0x4000:{
                var x = (opcode & 0x0F00) >> 8;
                var nn = (opcode & 0x00FF);

                if(this.v[x] != nn){
                    this.pc += 4
                } else {
                    this.pc += 2
                }
                break;
            }

            case 0x5000:{
                var x = (opcode & 0x0F00) >> 8;
                var y = (opcode & 0x00F0) >> 4;

                if(this.v[x] == this.v[y]){
                    this.pc += 4;
                } else{
                    this.pc += 2;
                }
                break;

            }

            case 0x6000:{
                //6XNN: Set VX to NN
                var x = (opcode & 0x0F00) >> 8;
                this.v[x] = opcode & 0x00FF;
                this.pc += 2;
                break;
            }

            case 0x7000:{
                //7XNN Adds NN to VX
                var x = (opcode & 0x0F00) >> 8;
                var nn = (opcode & 0x00FF);
                this.v[x] = this.v[x] + nn;
                this.pc += 2;
                break;
            }

            case 0x8000:{
                switch(opcode & 0x000F){

                    case 0x0000:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[x] = this.v[y];
                        this.pc += 2;
                        break;
                    }

                    case 0x0001:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[x] = (this.v[x] | this.v[y]);
                        this.pc += 2;
                        break;
                    }

                    case 0x0002:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[x] = this.v[x] & this.v[y];
                        this.pc += 2;
                        break;
                    }

                    case 0x0003:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[x] ^= this.v[y];
                        this.pc += 2;
                        break;
                    }

                    case 0x0004:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;

                        if(this.v[y] > 0xFF - this.v[x]){
                            this.v[0xF] = 1;
                        }else{
                            this.v[0xF] = 0;
                        }
                        this.v[x] = (this.v[x] + this.v[y]) & 0xFF;
                        this.pc += 2;
                        break;
                    }

                    case 0x0005:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        total = this.v[x] - this.v[y];
                        (total < 0) ? this.v[0xF] = 0 : this.v[0xF] = 1;
                        this.v[x] = Math.abs(total) % 256; 
                        this.pc += 2;
                        break;
                    }

                    case 0x0006:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[0xF] = this.v[x] & 0x1;
                        this.v[x] >>= 1; 
                        this.pc += 2; 
                        break;
                    }

                    case 0x0007:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;

                        total = this.v[y] - this.v[x];
                        (total < 0) ? this.v[0xF] = 0 : this.v[0xF] = 1;
                        this.v[x] = Math.abs(total);
                        this.pc += 2; 
                        break;
                    }

                    case 0x000E:{
                        var x = (opcode & 0x0F00) >> 8;
                        var y = (opcode & 0x00F0) >> 4;
                        this.v[0xF] = this.v[x] >> 7;
                        this.v[x] = (this.v[x] << 1) % 256; 
                        this.pc += 2; 
                        break;
                    }

                    default:
                        console.error("Error: Unsupported Opcode!");
                        this.isRunning = false;
                        break;
                }
                break;
            }

            case 0x9000:{
                var x = (opcode & 0x0F00) >> 8;
                var y = (opcode & 0x00F0) >> 4;
                if(this.v[x] != this.v[y]){
                    this.pc += 4;
                } else {
                    this.pc += 2;
                }
                break;
            }

            case 0xA000:{
                 //ANNN: Set I to NNN
                 this.i = opcode & 0x0FFF;
                 this.pc += 2;
                 break;
            }

            case 0xB000:{
                total = (opcode & 0x0FFF) + this.v[0x0];
                this.pc = total % 4096;
                break;
            }

            case 0xC000:{
                var x = (opcode & 0x0F00) >> 8;
                var randomNumber;

                randomNumber = Math.floor(Math.random() * (0x01 + 0xFF));
                this.v[x] = randomNumber & (opcode & 0x00FF);

                this.pc += 2; // Increment the program counter.
                break;
            }

            case 0xD000:{
                 //DXYN: Draw a sprite(X, Y) size (8, n). Sprite located at I
                 var x = this.v[(opcode & 0x0F00) >> 8];
                 var y = this.v[(opcode & 0x00F0) >> 4];
                 var height = opcode & 0x000F;
 
                 this.v[0xF] = 0;
 
                 for(var _y = 0; _y < height; _y++){
                     var line = this.memory[this.i + _y];
                     for(var _x = 0; _x < 8; _x++){
                         var pixel = line & (0x80 >> _x);
                         if(pixel != 0){
                             var totalX = x + _x;
                             var totalY = y + _y;
                             var index = (totalY * 64) + totalX;
 
                             if(this.display[index] == 1)
                                 this.v[0xF] = 1;
 
                             this.display[index] ^= 1;
                         }
                     }
                 }
                 this.pc += 2;
                 this.drawflag = true;
                 break;
            }

            case 0xE000:{
                switch(opcode & 0x00FF){
                    case 0x009E:{
                        var x = (opcode & 0x0F00) >> 8;
                        var key1 = this.v[x];
                        if(this.key[key1] == 1){
                            this.pc += 4
                        } else {
                            this.pc += 2
                        }
                        break;
                    }
                    case 0x00A1:{
                        var x = (opcode & 0x0F00) >> 8;
                        var key1 = this.v[x];
                        if(this.key[key1] == 0){
                            this.pc += 4
                        } else {
                            this.pc += 2
                        }
                        break;
                    }
                    default: {
                        console.error("Error: Unexisting Opcode!");
                        this.isRunning = false;
                        break;
                    }
                }
                break;
            }

            case 0xF000:{
                switch(opcode & 0x00FF){
                    case 0x0007:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.v[x] = this.delayTimer;
                        this.pc += 2;
                        break;
                    }

                    case 0x000A:{
                        var x = (opcode & 0x0F00) >> 8;
                        var pressed = false;
                        for(i = 0; i < 16; i++){
                            if(this.key[i] != 0){
                                this.v[x] = i;
                                pressed = true;
                            }
                        }

                        if(!pressed) return;

                        this.pc += 2;
                        break;
                    }

                    case 0x0015:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.delayTimer = this.v[x];
                        this.pc += 2;
                        break;
                    }

                    case 0x0018:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.soundTimer = this.v[x];
                        this.pc += 2;
                        break;
                    }

                    case 0x001E:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.i = this.i + this.v[x];
                        this.pc += 2;
                        break;
                    }

                    case 0x0029:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.i = (this.v[x] * 5) + 0x050;
                        this.pc += 2;
                        break;
                    }

                    case 0x0033:{
                        var x = (opcode & 0x0F00) >> 8;
                        this.memory[this.i] = Math.floor(this.v[x] / 100);
                        this.memory[this.i + 1] = Math.floor((this.v[x] / 10) % 10);
                        this.memory[this.i + 2] = Math.floor((this.v[x] % 100) % 10);
                        this.pc += 2;
                        break;
                    }

                    case 0x0055:{
                        var xAddr = (opcode & 0x0F00) >> 8;
                        for(i = 0; i <= xAddr ; i++) {
                            this.memory[this.i + i] = this.v[i];
                        }
                        this.i += xAddr + 1;
                        this.pc += 2;
                        break;
                    }

                    case 0x0065:{
                        var xAddr = (opcode & 0x0F00) >> 8;
                        for(i = 0; i <= xAddr ; i++) {
                            this.v[i] = this.memory[this.i + i];
                        }
                        this.i += xAddr + 1;
                        this.pc += 2; 
                        break;
                    }
                }
                break;

            }

            default:{
                console.error("Error: Unsupported Opcode!");
                this.isRunning = false;
                break;
            }
        
        }

        //execute opcode

    },

    readAllBytesUInt8 : function(path){
        const fs = require('fs')
        console.log("%c Reading provided program file...", 'color: #0084ff');
        try{
            return fs.readFileSync(path);
        }
        catch{
            console.error("Error while reading program file.");
        }
    },

    loadProgram: async function(file){
        var program = this.readAllBytesUInt8(file);
        console.log("%c Successfully loaded program file!", 'color: #00ff2f');

        var offset = 0;
        if(program.length <= (4096 - 512)){

            try{
                for (i = 0; i < program.length; i++) {

                    this.memory[(i + 512)] = program[i];
                    offset++;

                }
                console.log("%c Successfully loaded program into memory!", 'color: #00ff2f');
                console.debug("Current Memory: " + this.memory);
            }
            catch{
                console.error("Error while loading program into memory.");
            }
        }
    },

    loadFontset: function(){
        var fontset = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        try{
            for (var i = 0; i < fontset.length; i++) {
                this.memory[(i + 0x50)] = fontset[i] & 0xFF;
            }
            console.log("%c Successfully loaded fontset into memory!", 'color: #00ff2f');
            console.debug("Current Memory: " + this.memory);
        }
        catch{
            console.error("Error while loading fontset into memory.");
        }
    },

    reset: function(){

    },

    getDisplay : function(){
        return this.display;
    }
}

module.exports.Chip8 = Chip8;