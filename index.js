let Promise = require( 'bluebird' ),
	isFiniteNumber = require( 'lodash.isfinite' ),
	isFunction = require( 'lodash.isfunction' );

class Throttler {

	constructor( slotCount, slotCooldown ) {
		if ( !isFiniteNumber( slotCount ) )
			throw new Error( 'No or invalid slotCount parameter given' );
		if ( !isFiniteNumber( slotCooldown ) )
			throw new Error( 'No or invalid slotCooldown parameter given' );

		this._slotCount = Math.max( slotCount, 1 );
		this._slotCooldown = Math.max( slotCooldown, 0 );
		this._availableSlots = new Array( this._slotCount ).fill( 0 ).map( ( v, i ) => Date.now() + i * this._slotCooldown / this._slotCount );
		this._waitingRequests = [];
	}

	_awaitSlot() {
		if ( this._availableSlots.length > 0 ) {
			var slot = this._availableSlots.shift(),
				now = Date.now(),
				promise = Promise.resolve( slot );
			if ( slot > now ) {
				promise = promise.delay( slot - now );
			}
			return promise;
		} else {
			// Semaphore implementation using promises.
			var release;
			var promise = new Promise( function() {
				release = arguments[ 0 ];
			} );
			this._waitingRequests.push( { release: release } );
			return promise.then( () => this._awaitSlot() );
		}
	}

	_releaseSlot() {
		this._availableSlots.push( Date.now() + this._slotCooldown );
		if ( this._waitingRequests.length > 0 ) this._waitingRequests.shift().release();
	}

	throttle( fn ) {
		if ( !isFunction( fn ) )
			return Promise.reject( new Error( 'No or invalid function given.' ) );

		return this._awaitSlot()
			.then( ( slot ) => fn() )
			.finally( () => {
				this._releaseSlot();
			} );
	}
}

module.exports = Throttler;
