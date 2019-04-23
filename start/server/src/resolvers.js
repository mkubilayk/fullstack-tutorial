const { paginateResults } = require('./utils');

module.exports = {
    Query: {
        launches: async (_root, { pageSize = 20, after }, { dataSources }) => {
            const allLaunches = await dataSources.launchAPI.getAllLaunches();
            allLaunches.reverse();

            const launches = paginateResults({
                after,
                pageSize,
                results: allLaunches
            });

            const lastElem = allLaunches.length ? allLaunches[allLaunches.length - 1] : null;
            const lastElemInPage = launches.length ? launches[launches.length - 1] : null;

            return {
                launches,
                cursor: lastElem ? lastElem.cursor : null,
                hasMore: lastElem && lastElemInPage && lastElem.cursor !== lastElemInPage.cursor
            };
        },
        launch: (_root, { id }, { dataSources }) => {
            return dataSources.launchAPI.getLaunchById({ launchId: id });
        },
        me: (_root, _args, { dataSources }) => {
            return dataSources.userAPI.findOrCreateUser();
        }
    },
    Mission: {
        missionPatch: (mission, { size } = { size: 'LARGE' }) => {
            return size === 'SMALL' ? 
                mission.missionPatchSmall : 
                mission.missionPatchLarge;
        }
    },
    Launch: {
        isBooked: (launch, _args, { dataSources }) => {
            return dataSources.userAPI.isBookedOnLaunch({
                launchId: launch.id
            });
        }
    },
    User: {
        trips: async (_user, _args, { dataSources }) => {
            const launchIds = await dataSources.userAPI.getLaunchIdsByUser();

            if (!launchIds.length) {
                return [];
            }

            return dataSources.launchAPI.getLaunchesByIds({ launchIds });
        }
    },
    Mutation: {
        login: async (_root, { email }, { dataSources }) => {
            const user = await dataSources.userAPI.findOrCreateUser({ email });
            if (user) {
                return Buffer.from(email).toString('base64');
            }
        },
        bookTrips: async (_root, { launchIds }, { dataSources }) => {
            const results = await dataSources.userAPI.bookTrips({ launchIds });
            const launches = await dataSources.launchAPI.getLaunchesByIds({
                launchIds
            });

            const success = results && results.length === launchIds.length;

            return {
                success,
                message: success ?
                    'trips booked successfully' :
                    `the following launches couldn't be booked: ${ launchIds.filter(
                        id => !results.includes(id)
                    ) }`,
                launches
              };
        },
        cancelTrip: async (_root, { launchId }, { dataSources }) => {
            const result = await dataSources.userAPI.cancelTrip({ launchId });

            if (!result) {
                return {
                    success: false,
                    message: 'failed to cancel trip'
                };
            }

            const launch = await dataSources.launchAPI.getLaunchById({ launchId });
            
            return {
                success: true,
                message: 'trip cancelled',
                launches: [launch]
            };
        }
    }
};