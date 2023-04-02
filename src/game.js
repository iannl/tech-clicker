var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-example',
    physics: {
        default: 'arcade',
        arcade: { debug: true }
    }
};
var game = new Phaser.Game(config)
var locale=window.location.hash.replace('#','')
if(locale=='')locale='en'
game.state.add('play', {
    preload: function() {
        this.game.load.image('forest-back', 'assets/parallax_forest_pack/layers/parallax-forest-back-trees.png');
        this.game.load.image('forest-lights', 'assets/parallax_forest_pack/layers/parallax-forest-lights.png');
        this.game.load.image('forest-middle', 'assets/parallax_forest_pack/layers/parallax-forest-middle-trees.png');
        this.game.load.image('forest-front', 'assets/parallax_forest_pack/layers/parallax-forest-front-trees.png');

        this.game.load.image('bananaphone', 'assets/tech/bananaphone.png');
        this.game.load.image('calculator', 'assets/tech/calculator.png');
        this.game.load.image('smartphone', 'assets/tech/smartphone.png');
        this.game.load.image('laptop', 'assets/tech/laptop.png');
        this.game.load.image('desktop', 'assets/tech/desktop.png');
        this.game.load.image('supercomputer', 'assets/tech/supercomputer.png');

        this.game.load.image('techCoins_coin', 'assets/icons/coin.png');

        this.game.load.image('cursor', 'assets/icons/cursor.png');

        // build panel for upgrades
        var bmd = this.game.add.bitmapData(250, 500);
        bmd.ctx.fillStyle = '#9a783d';
        bmd.ctx.strokeStyle = '#35371c';
        bmd.ctx.lineWidth = 12;
        bmd.ctx.fillRect(0, 0, 250, 500);
        bmd.ctx.strokeRect(0, 0, 250, 500);
        this.game.cache.addBitmapData('upgradePanel', bmd);

        var buttonImage = this.game.add.bitmapData(476, 48);
        buttonImage.ctx.fillStyle = '#e6dec7';
        buttonImage.ctx.strokeStyle = '#35371c';
        buttonImage.ctx.lineWidth = 4;
        buttonImage.ctx.fillRect(0, 0, 225, 48);
        buttonImage.ctx.strokeRect(0, 0, 225, 48);
        this.game.cache.addBitmapData('button', buttonImage);

        // the main player
        this.player = {
            clickDmg: 1,
            techCoins: 0,
            dps: 0,
            monsterNum: 0,

        };

        // world progression
        this.level = 1;
        // how many monsters have we killed during this level
        this.levelKills = 0;
        // how many monsters are required to advance a level
        this.levelKillsRequired = 10;
    },
    create: function() {
        var state = this;

        this.background = this.game.add.group();
        // setup each of our background layers to take the full screen
        ['forest-back', 'forest-lights', 'forest-middle', 'forest-front']
            .forEach(function(image) {
                var bg = state.game.add.tileSprite(0, 0, state.game.world.width,
                    state.game.world.height, image, '', state.background);
                bg.tileScale.setTo(4,4);
            });

        this.upgradePanel = this.game.add.image(10, 70, this.game.cache.getBitmapData('upgradePanel'));
        var upgradeButtons = this.upgradePanel.addChild(this.game.add.group());
        upgradeButtons.position.setTo(8, 8);

        var upgradeButtonsData = [
            {icon: 'techCoins_coin', name: lang[locale].upgrade.multiplier.display, level: 0, cost: 30, purchaseHandler: function(button, player) {
                player.clickDmg += 1;
            }},
            {icon: 'cursor', name: 'Auto Click', level: 0, cost: 25, purchaseHandler: function(button, player) {
                player.dps += 1;
            }}
        ];

        var button;
        upgradeButtonsData.forEach(function(buttonData, index) {
            button = state.game.add.button(0, (50 * index), state.game.cache.getBitmapData('button'));
            button.icon = button.addChild(state.game.add.image(6, 6, buttonData.icon));
            button.text = button.addChild(state.game.add.text(42, 6, buttonData.name + ': ' + buttonData.level, {font: '16px Arial Black'}));
            button.details = buttonData;
            button.costText = button.addChild(state.game.add.text(42, 24, lang[locale].misc.cost.display+': ' + buttonData.cost, {font: '16px Arial Black'}));
            button.events.onInputDown.add(state.onUpgradeButtonClick, state);

            upgradeButtons.addChild(button);
        });

        var monsterData = [
            {name: lang[locale].tech.bananaphone.display,     image: 'bananaphone',    research: 128},
            {name: lang[locale].tech.calculator.display,      image: 'calculator',     research: 256},
            {name: lang[locale].tech.smartphone.display,      image: 'smartphone',     research: 512},
            {name: lang[locale].tech.laptop.display,          image: 'laptop',         research: 1024},
            {name: lang[locale].tech.desktop.display,         image: 'desktop',        research: 2048},
            {name: lang[locale].tech.supercomputer.display,   image: 'supercomputer',  research: 100000000},
        ];
        this.monsters = this.game.add.group();
        var monster;
        monsterData.forEach(function(data) {
            // create a sprite for them off screen
            monster = state.monsters.create(1000, state.game.world.centerY, data.image);
            // use the built in health component
            monster.health = monster.research = data.research;
            // center anchor
            monster.anchor.setTo(0.5, 1);
            // reference to the database
            monster.details = data;

            //enable input so we can click it!
            monster.inputEnabled = true;
            monster.events.onInputDown.add(state.onClickMonster, state);

            // hook into health and lifecycle events
            monster.events.onKilled.add(state.onKilledMonster, state);
            monster.events.onRevived.add(state.onRevivedMonster, state);
        });
        window.testvar=this.monsters

        // display the monster front and center
        this.currentTech = this.monsters.children[this.player.monsterNum]
        this.currentTech.position.set(this.game.world.centerX + 100, this.game.world.centerY + 50);

        this.monsterInfoUI = this.game.add.group();
        this.monsterInfoUI.position.setTo(this.currentTech.x - 220, this.currentTech.y + 120);
        this.monsterNameText = this.monsterInfoUI.addChild(this.game.add.text(0, 0, this.currentTech.details.name, {
            font: '48px Arial Black',
            fill: '#fff',
            strokeThickness: 4
        }));
        this.monsterHealthText = this.monsterInfoUI.addChild(this.game.add.text(0, 60, this.currentTech.health + ' '+lang[locale].research.display, {
            font: '22px Arial Black',
            fill: '#ff0000',
            strokeThickness: 4
        }));

        this.dmgTextPool = this.add.group();
        var dmgText;
        for (var d=0; d<50; d++) {
            dmgText = this.add.text(0, 0, '1', {
                font: '64px Arial Black',
                fill: '#fff',
                strokeThickness: 4
            });
            // start out not existing, so we don't draw it yet
            dmgText.exists = false;
            dmgText.tween = game.add.tween(dmgText)
                .to({
                    alpha: 0,
                    y: 100,
                    x: this.game.rnd.integerInRange(100, 700)
                }, 1000, Phaser.Easing.Cubic.Out);

            dmgText.tween.onComplete.add(function(text, tween) {
                text.kill();
            });
            this.dmgTextPool.add(dmgText);
        }

        // create a pool of techCoins coins
        this.coins = this.add.group();
        this.coins.createMultiple(50, 'techCoins_coin', '', false);
        this.coins.setAll('inputEnabled', true);
        this.coins.setAll('techCoinsValue', 1);
        this.coins.callAll('events.onInputDown.add', 'events.onInputDown', this.onClickCoin, this);
        game.physics.arcade.enable(this.coins);
        this.playertechCoinsText = this.add.text(30, 30, lang[locale].coin.display + ': ' + this.player.techCoins, {
            font: '24px Arial Black',
            fill: '#fff',
            strokeThickness: 4
        });

        // 100ms 10x a second
        this.dpsTime=0
        this.dpsTimer = this.game.time.events.loop(100, this.onDPS, this);

        // setup the world progression display
        this.levelUI = this.game.add.group();
        this.levelUI.position.setTo(this.game.world.centerX, 30);
        this.levelText = this.levelUI.addChild(this.game.add.text(0, 0, 'Level: ' + this.level, {
            font: '24px Arial Black',
            fill: '#fff',
            strokeThickness: 4
        }));
        this.levelKillsText = this.levelUI.addChild(this.game.add.text(0, 30, 'Kills: ' + this.levelKills + '/' + this.levelKillsRequired, {
            font: '24px Arial Black',
            fill: '#fff',
            strokeThickness: 4
        }));
        this.levelText.kill()
        this.levelKillsText.kill()
    },
    onDPS: function() {
        this.dpsTime++
        if (this.player.dps > 0) {
            if(this.dpsTime>(5/this.player.dps)*10){
                this.dpsTime=0
                this.onClickMonster(null,{positionDown:{x:0,y:0}})
            }
        }else{
            this.dpsTime=0
        }
    },
    onUpgradeButtonClick: function(button, pointer) {
        // make this a function so that it updates after we buy
        function getAdjustedCost() {
            return Math.ceil(button.details.cost + (button.details.level * 15));
        }

        if (this.player.techCoins - getAdjustedCost() >= 0) {
            this.player.techCoins -= getAdjustedCost();
            this.playertechCoinsText.text = lang[locale].coin.display + ': ' + this.player.techCoins;
            button.details.level++;
            button.text.text = button.details.name + ': ' + button.details.level;
            button.costText.text = 'Cost: ' + getAdjustedCost();
            button.details.purchaseHandler.call(this, button, this.player);
        }
    },
    onClickCoin: function(coin) {
        if (!coin.alive) {
            return;
        }

        this.physics.arcade.moveToXY(coin, 0, 0, 0, 500);
        var that=this
        setTimeout(function(){
            coin.kill()

            // give the player techCoins
            that.player.techCoins += coin.techCoinsValue;
            // update UI
            that.playertechCoinsText.text = lang[locale].coin.display + ': ' + that.player.techCoins;
            // move the coin
        }, 800);

    },
    onKilledMonster: function(monster) {
        this.player.monsterNum++
        // move the monster off screen again
        monster.position.set(1000, this.game.world.centerY);

        this.levelKills++;

        if (this.levelKills >= this.levelKillsRequired) {
            this.level++;
            this.levelKills = 0;
        }

        this.levelText.text = 'Level: ' + this.level;
        this.levelKillsText.text = 'Kills: ' + this.levelKills + '/' + this.levelKillsRequired;

        // pick a new monster
        this.currentTech = this.monsters.children[this.player.monsterNum]
        // upgrade the monster based on level
        this.currentTech.research = Math.ceil(this.currentTech.details.research + ((this.level - 1) * 10.6));
        // make sure they are fully healed
        this.currentTech.revive(this.currentTech.research);
    },
    onRevivedMonster: function(monster) {
        monster.position.set(this.game.world.centerX + 100, this.game.world.centerY + 50);
        // update the text display
        this.monsterNameText.text = monster.details.name;
        this.monsterHealthText.text = monster.health + ' '+lang[locale].research.display;
    },
    onClickMonster: function(monster, pointer) {
        // apply click damage to monster
        var coin;
        // spawn a coin on the ground
        coin = this.coins.getFirstExists(false);
        coin.reset(this.game.world.centerX+Math.floor(Math.random() * 200 - 100), this.game.world.centerY+Math.floor(Math.random() * 200 - 100));
        coin.techCoinsValue = Math.round(this.level * 1.33);
        this.game.time.events.add(Phaser.Timer.SECOND * 0, this.onClickCoin, this, coin);
        coin.techCoinsValue=this.player.clickDmg
        this.currentTech.damage(1);

        // grab a damage text from the pool to display what happened
        var dmgText = this.dmgTextPool.getFirstExists(false);
        if (dmgText) {
            dmgText.text = this.player.clickDmg;
            dmgText.reset(pointer.positionDown.x, pointer.positionDown.y);
            dmgText.alpha = 1;
            dmgText.tween.start();
        }

        // update the health text
        this.monsterHealthText.text = this.currentTech.alive ? this.currentTech.health + ' '+lang[locale].research.display : 'DEAD';
    }
});

game.state.start('play');
