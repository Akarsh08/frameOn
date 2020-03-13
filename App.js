import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Image,
  SafeAreaView,
  FlatList,
  TouchableOpacity
} from "react-native";
import Loader from "./src/Components/Loader";

import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import * as posenet from "@tensorflow-models/posenet";
import { Camera } from "expo-camera";
import * as Permissions from "expo-permissions";
import { find } from "lodash";

const { width, height } = Dimensions.get("window");

const conversionFactor = width / 168;
const SCORE_THRESHOLD = 0.85;
const MASK_ORGINIAL_DIMS = 30;
const NORMALIZATION_FACTOR = 35;

const TensorCamera = cameraWithTensors(Camera);

const glasses = [
  require("./assets/sun.png"),
  require("./assets/aviatorblack.png"),
  require("./assets/blueglass.png"),
  require("./assets/aviatorblue.png"),
  require("./assets/blackglass.png")
];

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
      model: undefined,
      pose: [],
      selectedGlass: glasses[0]
    };
  }

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    // Wait for tf to be ready.
    await tf.ready();
    const model = await posenet.load();

    // Signal to the app that tensorflow.js can now be used.
    this.setState({
      model,
      isTfReady: true
    });
  }

  handleImageTensorReady = (images, updatePreview, gl) => {
    const loop = async () => {
      const { modelName } = this.state;

      if (this.state.model != null) {
        const imageTensor = images.next().value;
        const flipHorizontal = Platform.OS === "ios" ? false : true;
        const pose = await this.state.model.estimateSinglePose(imageTensor, {
          flipHorizontal
        });
        this.setState({ pose });
        tf.dispose([imageTensor]);
      }

      this.rafID = requestAnimationFrame(loop);
    };

    loop();
  };

  renderEyePoints() {
    const { pose, selectedGlass } = this.state;
    const keypoints = pose.keypoints;
    let scale = 1;
    let LE,
      RE,
      topOffset = 80,
      leftOffset = 45;
    if (keypoints && keypoints.length > 1) {
      LE = find(
        keypoints,
        k => k.score > SCORE_THRESHOLD && k.part === "leftEye"
      );
      RE = find(
        keypoints,
        k => k.score > SCORE_THRESHOLD && k.part === "rightEye"
      );
      if (LE && RE) {
        const scaledLEY = LE.position.y * conversionFactor;
        const scaledLEX = LE.position.x * conversionFactor;
        scale =
          (RE.position.x * conversionFactor -
            LE.position.x * conversionFactor) /
          NORMALIZATION_FACTOR; //scale for sunglasses
        scale = Math.abs(scale);
        topOffset = scaledLEY / 2.4;
        leftOffset = 40;
      }
    }

    return (
      pose !== null &&
      pose.keypoints &&
      LE && (
        <View style={{ backgroundColor: "#0f04" }}>
          <Image
            source={selectedGlass}
            resizeMode="contain"
            style={{
              width: MASK_ORGINIAL_DIMS * 2.7,
              height: MASK_ORGINIAL_DIMS,
              position: "absolute",
              top: LE.position.y * conversionFactor + topOffset,
              left: LE.position.x * conversionFactor + leftOffset,
              transform: [{ scale: scale }]
            }}
          />
        </View>
      )
    );
  }

  render() {
    const { isTfReady } = this.state;
    return (
      <View style={styles.container}>
        {!isTfReady ? (
          <Loader />
        ) : (
          <View>
            <TensorCamera
              type={Camera.Constants.Type.front}
              zoom={0}
              style={{ width, height: width * 1.333 }}
              autorender={true}
              resizeWidth={168}
              resizeHeight={224}
              cameraTextureWidth={1200}
              cameraTextureHeight={1600}
              renderDepth={3}
              onReady={this.handleImageTensorReady}
            />
            <View
              style={{
                zIndex: 20,
                width,
                height: 1.333 * width,
                position: "absolute",
                top: 0,
                left: 0
              }}
            >
              {this.renderEyePoints()}
            </View>

            <View
              style={{
                zIndex: 21,
                height: 80,
                alignItems: "center",
                marginTop: 20,
                width
              }}
            >
              <FlatList
                data={glasses}
                contentContainerStyle={{ flex: 1, width }}
                numColumns={5}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ margin: 5 }}
                    onPress={() => this.setState({ selectedGlass: item })}
                  >
                    <Image
                      source={item}
                      resizeMode="contain"
                      style={{ width: 70, height: 70 }}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center"
  }
});
