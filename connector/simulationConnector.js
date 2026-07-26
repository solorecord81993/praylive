export class SimulationConnector {
  constructor(onEvent) { this.onEvent=onEvent; this.timer=null; }
  connect() { console.log('Simulation connector ready'); this.timer=setInterval(()=>this.onEvent({id:crypto.randomUUID(),type:'like',count:10}),10_000); }
  disconnect() { clearInterval(this.timer); }
}
