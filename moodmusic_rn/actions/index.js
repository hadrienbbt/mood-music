import * as userActions from './user'
import * as api_spotifyActions from './api_spotify'
import * as api_moodmusicActions from './api_moodmusic'

export const ActionCreators = Object.assign({},
    userActions,
    api_spotifyActions,
    api_moodmusicActions,
)