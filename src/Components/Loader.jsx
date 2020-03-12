import React, { Component } from 'react';
import LottieView from "lottie-react-native";


class Loader extends Component {
  constructor(props) {
    super(props);
    this.state = {  };
  }
  render() {
    return (
      <LottieView autoPlay style={{width: 300, height: 300}} source={require('../../assets/4338-glasses-dance.json')} />
    );
  }
}

export default Loader;