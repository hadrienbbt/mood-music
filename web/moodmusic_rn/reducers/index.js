import { combineReducers } from 'redux'
import { firebaseReducer } from 'react-redux-firebase'

import * as userReducer from './user'
import * as artistReducer from './artist'
import * as api_spotifyReducer from './api_spotify'

export default combineReducers(Object.assign(
  firebaseReducer,
  userReducer,
  artistReducer,
  api_spotifyReducer
))
