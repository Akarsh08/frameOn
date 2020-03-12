import React from "react";
import {
	StyleSheet,
	Text,
	View,
	Dimensions,
	Image,
	SafeAreaView
} from "react-native";
import Loader from "./src/Components/Loader";

import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import * as posenet from "@tensorflow-models/posenet";
import { Camera } from "expo-camera";
import * as Permissions from "expo-permissions";

const { width, height } = Dimensions.get("window");

const conversionFactor = width / 168;

const TensorCamera = cameraWithTensors(Camera);

export default class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isTfReady: false,
			model: undefined,
			pose: []
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
		const { pose } = this.state;
		const keypoints = pose.keypoints;
		let scale = 1;
		if (keypoints && keypoints.length > 1) {
			const points = keypoints.filter(
				k => k.score > 0.2 && (k.part === "leftEye" || k.part === "rightEye")
			);
			if (points && points.length > 1) {
				scale = (points[0].position.x - points[1].position.x) / 12;
			}
		}

		return (
			pose !== null &&
			pose.keypoints && (
				<View>
					{keypoints
						.filter(k => k.score > 0.5)
						.map(point => (
							<View
								// source={require("./assets/sun.png")}
								// resizeMode="contain"
								style={{
									width: 3,
									height: 3,
									backgroundColor: "red",
									position: "absolute",
									top: point.position.y * conversionFactor + 60,
									left: point.position.x * conversionFactor + 35,
									transform: [{ scale: scale }]
								}}
							/>
						))}
				</View>
			)
		);
	}

	render() {
		const { isTfReady } = this.state;
		return (
			<SafeAreaView>
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
									position: "absolute"
								}}
							>
								{this.renderEyePoints()}
							</View>
							<View style={{ alignItems: "center", marginTop: 20 }}>
								<Image
									source={require("./assets/sun.png")}
									resizeMode="contain"
									style={{ width: 70, height: 70 }}
								/>
							</View>
						</View>
					)}
				</View>
			</SafeAreaView>
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
