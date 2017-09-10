(function() {

  // ---- RxJS minimal implementation ----

  class SafeObserver {

    destination: any
    isUnsubscribed: boolean
    unsub: any

    constructor(destination) {
      this.destination = destination;
    }
    
    next(value) {
      // only try to next if you're subscribed have a handler
      if (!this.isUnsubscribed && this.destination.next) {
        try {
          this.destination.next(value);
        } catch (err) {
          // if the provided handler errors, teardown resources, then throw
          this.unsubscribe();
          throw err;
        }
      }
    }
    
    error(err) {
      // only try to emit error if you're subscribed and have a handler
      if (!this.isUnsubscribed && this.destination.error) {
        try {
          this.destination.error(err);
        } catch (e2) {
          // if the provided handler errors, teardown resources, then throw
          this.unsubscribe();
          throw e2;
        }
        this.unsubscribe();
      }
    }

    complete() {
      // only try to emit completion if you're subscribed and have a handler
      if (!this.isUnsubscribed && this.destination.complete) {
        try {
          this.destination.complete();
        } catch (err) {
          // if the provided handler errors, teardown resources, then throw
          this.unsubscribe();
          throw err;
        }
        this.unsubscribe();
      }
    }
    
    unsubscribe() {
      this.isUnsubscribed = true;
      if (this.unsub) {
        this.unsub();
      }
    }
  }

  class Observable {
    _subscribe: any

    constructor(_subscribe) {
      this._subscribe = _subscribe;
    }
    
    subscribe(observer) {
      const safeObserver = new SafeObserver(observer);
      safeObserver.unsub = this._subscribe(safeObserver);
      return safeObserver.unsubscribe.bind(safeObserver);
    }
  }


  const map = project => source => new Observable(observer =>
      source.subscribe({
        next: x => observer.next(project(x)),
        error: err => observer.error(err),
        complete: () => observer.complete()
      })
    )
    
  const filter = f => source => new Observable(observer =>
      source.subscribe({
        next: x => f(x) ? observer.next(x) : void 8,
        error: err => observer.error(err),
        complete: () => observer.complete()
      })
    )
    
  const take = limit => source => new Observable(observer => {
      var i = 0;
      return source.subscribe({
        next: x => { i++; observer.next(x); if(i == limit) { observer.complete() } },
        error: err => observer.error(err),
        complete: () => observer.complete()
      })
    })

  const act = f => map(x => { f(x); return x })

  const startWith = init => source => new Observable(observer => {
      observer.next(init)
      return source.subscribe(observer);
    })

  const scan = f => source => new Observable(observer => {
      var last = null;
      var has_last = false;
      const mapObserver = {
        next: x => { 
          last = has_last ? f(last, x) : x; 
          has_last = true; 
          return observer.next(last) 
        },
        error: err => observer.error(err),
        complete: () => observer.complete()
      };
      return source.subscribe(mapObserver);
    })

  const withLatestFrom = right => source => new Observable(observer => {
      var right_val = null
      const sourceObserver = {
        next: x => observer.next([x, right_val]),
        error: err => observer.error(err),
        complete: () => observer.complete()
      };
      const rightObserver = {
        next: x => { right_val = x },
        error: err => observer.error(err),
        complete: () => observer.complete()
      };
      const source_unsub = source.subscribe(sourceObserver);
      const right_unsub = right.subscribe(rightObserver)
      const unsub = () => { 
        source_unsub();
        right_unsub();
      }
      return unsub
    })

  const timer = (interval, limit = Infinity) => new Observable(observer => {
    var i = 0
    const t = setInterval(() => {
      observer.next(i++)
      if(i == limit) {
        observer.complete()
        clearInterval(t)
      }
    }, interval)
    return () => clearInterval(t)
  })
  const fromEvent = (element, eventname) => new Observable(observer => {
    const callback = e => observer.next(e)
    element.addEventListener(eventname, callback)
    return () => element.removeEventListener(eventname, callback)
  }) 

  function pipe(initialValue, ...fns) {
    return fns.reduce((state, fn) => fn(state), initialValue);
  }


  // ---- user code ----


  const post = data => {
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.open("POST", "http://172.30.139.155:8080/")  //TODO: change the URL
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
    xmlhttp.send(JSON.stringify(data))
  }


  const pd = (p, a, b) => Math.pow(a.latest[p] - b.latest[p], 2)

  const orientation$ = pipe(
    fromEvent(window, 'deviceorientation'),
    map(event => ({latest: {alpha: event.alpha, beta: event.beta, gamma: event.gamma}, count: 1, distance: 0 })),
    startWith({latest: null, count: 0, distance: 0 }),
    scan((acc, a) => ({
      latest: a.latest, count: acc.count + 1, 
      distance: acc.distance + (!acc.latest ? 0 : Math.sqrt( pd('alpha', a, acc) + pd('beta', a, acc) + pd('gamma', a, acc) ) )
    }))
  )

  const unsub = pipe(timer(1000), // every 1 second
    withLatestFrom(orientation$), 
    act(x => console.log(JSON.stringify(x))), // just log for dev
    act(post),
    filter(([, x]) => x.distance > 10000), // TODO: use a smaller distance, 100 is enough
    take(1)
  ).subscribe({
    next(x) { console.log('about to complete', x); },
    error(err) { console.error(err); }, 
    complete() { console.log('done'); post({ handset_detected: true }) } // stream only completes when a real handset is detected, TODO: rediect to the landing page
  });
})()