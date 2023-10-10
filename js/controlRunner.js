export default function controlRunner(serverBus, controller) {
	return function (state, ac) {
		try {
			var nextState = controller.action(state, ac);
			controller.postAction(serverBus, state, nextState, ac);
			return nextState;
		} catch (e) {
			console.log('Error', e);
			return state;
		}
	};
}
