// shots.js — screenshot hooks. The kit's flow loads the game with
// ?shot=<name>&seed=<n>; each scene starts a new game and stages a real
// moment of play (a chase, a job, the beach road) for the camera.
// The same hooks are exposed as window.PALMERA for automated play-tests.

const Shots = {
  applied: false,

  givePlayerCar(x, y, angle, modelIdx) {
    const car = Cars.make(modelIdx, x, y, angle, { driver: 'player' });
    car.ai = null;
    Player.car = car;
    Player.x = x; Player.y = y; Player.angle = angle;
    return car;
  },

  addCop(x, y, angle) {
    const car = Cars.make(1, x, y, angle);
    car.color = '#20242c'; car.ai = 'police'; car.driver = 'police';
    car.stuckFor = 0; car.reverseFor = 0;
    Police.units.push(car);
    return car;
  },

  scene(name) {
    newGame();
    if (name === 'cover') {
      // On foot in the city centre at sunset, traffic rolling past.
      Player.placeAt(742, 1470);
      Player.angle = Math.PI * 0.8;
      Missions.startNext();
    } else if (name === 'chase') {
      // Three stars, two units on the tail, mid-job.
      Missions.startNext();
      const car = this.givePlayerCar(1180, 1352, Math.PI / 2, 3);
      car.speed = 250;
      S.heat = 3.2;
      this.addCop(930, 1300, Math.PI / 2);
      this.addCop(850, 1420, Math.PI / 2);
    } else if (name === 'mission') {
      // Walking up to the Café Brisa pickup, marker beam ahead.
      Missions.startNext();
      Player.placeAt(905, 735);
      Player.angle = -0.5;
    } else if (name === 'beach') {
      // Cruising the coast road, sand and sea on the right.
      const car = this.givePlayerCar(2880, 900, Math.PI, 2);
      car.speed = 190;
    }
    this.applied = true;
  },

  init() {
    const shot = new URLSearchParams(location.search).get('shot');
    window.PALMERA = {
      scene: (n) => this.scene(n),
      start: () => newGame(),
      state: () => ({
        mode: S.mode, cash: S.cash, health: S.health,
        stars: Police.stars(), heat: S.heat,
        player: { x: Math.round(Player.x), y: Math.round(Player.y), inCar: !!Player.car },
        missionIndex: Missions.index, missionActive: !!Missions.active,
        cars: Cars.all.length, peds: Peds.list.length, cops: Police.units.length,
        shotApplied: this.applied,
      }),
      keys: { down: (c) => keys.add(c), up: (c) => keys.delete(c) },
      player: Player, state_: S,
      cars: Cars, peds: Peds, police: Police, missions: Missions, places: PLACES,
    };
    if (shot) {
      // Give the world a moment to populate, then stage the scene.
      setTimeout(() => this.scene(shot), 350);
    }
  },
};
