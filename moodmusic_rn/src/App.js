import React, { Component } from 'react'
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
} from 'react-native'

import { connect } from 'react-redux'
import { bindActionCreators,compose } from 'redux'
import { firebaseConnect, isLoaded, isEmpty } from 'react-redux-firebase'

import { ActionCreators } from '../actions'

Text.defaultProps.allowFontScaling = false
console.ignoredYellowBox = ['Remote debugger']

type Props = {}

class App extends Component<Props> {

    constructor(props) {
        super(props)
        props.initializeSpotify()
        console.log(props.firebase)
    }

    async spotifyLoginWorkflow() {
        try {
            await this.props.spotifyLogin()
            if (this.props.api_spotify.loggedIn) this.props.spotifyUserInfos()
        } catch(e) {console.log(e)}
    }

    render = () => (
        <View style={styles.container}>
            {this.props.api_spotify.initialized ?
                this.props.user ? (
                    <View style={styles.container}>
                        <Text>{`Bienvenue ${this.props.user.name} !`}</Text>
                        <Button title={"Obtenir les artistes préférés sur Moodmusic"}
                                onPress={() => this.props.getMoodmusicTopArtists(this.props.user._id)}
                                style={styles.button}
                        />
                        <Button
                            title={"Déconnecter"}
                            onPress={() => this.props.logout()}
                            style={styles.button}
                        />
                    </View>
                ) : (
                    <Button title={"Connexion avec Spotify"}
                            onPress={() => this.spotifyLoginWorkflow()}
                            style={styles.button}
                    />
            ) : (
                <Text>En attente de Spotify...</Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    button: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
        marginTop: 20,
    },
})

var mapStateToProps = state => ({
        user: state.user,
        api_spotify: state.api_spotify,
    }),
    mapDispatchToProps = dispatch => bindActionCreators(ActionCreators, dispatch)

export default compose(
    firebaseConnect(),
    connect(mapStateToProps,mapDispatchToProps)
)(App)
