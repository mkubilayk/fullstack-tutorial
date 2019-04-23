const { DataSource } = require('apollo-datasource');
const isEmail = require('isemail');

class UserAPI extends DataSource {
    constructor({ store }) {
        super();
        this.store = store;
    }

    initialize(config) {
        this.context = config.context;
    }

    async findOrCreateUser({ email } = {}) {
        const userEmail = this.context && this.context.user ?
            this.context.user.email :
            email;

        const users = await this.store.users.findOrCreate({ where: { email: userEmail }});
        return users && users[0] ? users[0] : null;
    }

    async bookTrips({ launchIds }) {
        const userId = this.context.user.id;

        if (!userId) {
            return;
        }

        let results = [];

        for (const launchId of launchIds) {
            const result = await this.bookTrip({ launchId });
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    async bookTrip({ launchId }) {
        const userId = this.context.user.id;
        const result = await this.store.trips.findOrCreate({
            where: { userId, launchId }
        });

        return result && result.length ? result[0].get() : false;
    }

    async cancelTrip({ launchId }) {
        const userId = this.context.user.id;
        return this.store.trips.destroy({ where: { userId, launchId }});
    }

    async getLaunchIdsByUser() {
        const userId = this.context.user.id;
        const trips = await this.store.trips.findAll({ where: { userId }});

        return trips && trips.length ? 
            trips.map(trip => trip.dataValues.launchId).filter(Boolean) :
            [];
    }

    async isBookedOnLaunch({ launchId }) {
        const userId = this.context.user.id;
        const trips = await this.store.trips.findAll({ where: { userId, launchId }});
        return trips && trips.length > 0;
    }
}

module.exports = UserAPI;
