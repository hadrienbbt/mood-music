import { combineReducers } from 'redux'
import { firebaseReducer } from 'react-redux-firebase'

import * as userReducer from './user'
import * as api_spotifyReducer from './api_spotify'

export default combineReducers(Object.assign(
    firebaseReducer,
    userReducer,
    api_spotifyReducer
))