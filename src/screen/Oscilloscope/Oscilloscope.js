import React, { Component } from 'react';
import debounce from 'lodash/debounce';
import GraphPanelLayout from '../../components/GraphPanelLayout';
import Graph from './components/Graph';
import ActionButtons from './components/ActionButtons';
import Settings from './components/Settings';

const electron = window.require('electron');
const { ipcRenderer } = electron;
const loadBalancer = window.require('electron-load-balancer');

class Oscilloscope extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isReading: false,
      data: [
        {
          ch1: 0,
          ch2: 0,
          ch3: 0,
          ch4: 0,
          timeGap: 0,
        },
      ],
      activeChannels: {
        ch1: true,
        ch2: false,
        ch3: false,
        ch4: false,
      },
      channelRanges: {
        ch1: '8',
        ch2: '8',
        ch3: '3',
      },
      channelMaps: {
        ch1: 'CH1',
        ch2: 'CH2',
        ch3: 'Inbuilt',
      },
      mapToMic: false,
      triggerVoltage: 0,
      timeBase: 40,
      triggerVoltageChannel: 'CH1',
      isTriggerActive: false,
      isFourierTransformActive: false,
      transformType: 'Sine',
      transformChannel1: 'CH1',
      transformChannel2: 'CH2',
      isXYPlotActive: false,
      plotChannel1: 'CH1',
      plotChannel2: 'CH2',
    };
  }

  componentDidMount() {
    ipcRenderer.on('TO_RENDERER_STATUS', (event, args) => {
      const { isConnected } = args;
      isConnected && this.getConfigFromDevice();
    });
    ipcRenderer.on('TO_RENDERER_DATA', (event, args) => {
      this.setState({
        ...args,
      });
    });
    ipcRenderer.on('TO_RENDERER_CONFIG', (event, args) => {
      const {
        ch1,
        ch2,
        ch3,
        ch4,
        ch1Map,
        ch2Map,
        ch3Map,
        mapToMic,
        triggerVoltage,
        triggerVoltageChannel,
        isTriggerActive,
        isFourierTransformActive,
        transformType,
        transformChannel1,
        transformChannel2,
        isXYPlotActive,
        plotChannel1,
        plotChannel2,
        timeBase,
      } = args;
      this.setState({
        activeChannels: { ch1, ch2, ch3, ch4 },
        channelMaps: { ch1: ch1Map, ch2: ch2Map, ch3: ch3Map },
        mapToMic,
        triggerVoltage,
        triggerVoltageChannel,
        isTriggerActive,
        isFourierTransformActive,
        transformType,
        transformChannel1,
        transformChannel2,
        isXYPlotActive,
        plotChannel1,
        plotChannel2,
        timeBase,
      });
    });
    this.getConfigFromDevice();
  }

  componentWillUnmount() {
    const { isReading } = this.state;
    isReading &&
      loadBalancer.send(ipcRenderer, 'linker', {
        command: 'STOP_OSC',
      });
    ipcRenderer.removeAllListeners('TO_RENDERER_DATA');
    ipcRenderer.removeAllListeners('TO_RENDERER_CONFIG');
  }

  getConfigFromDevice = debounce(() => {
    const { isConnected } = this.props;
    isConnected &&
      loadBalancer.send(ipcRenderer, 'linker', {
        command: 'GET_CONFIG_OSC',
      });
  }, 500);

  sendConfigToDevice = debounce(() => {
    const { isConnected } = this.props;
    const {
      activeChannels,
      timeBase,
      triggerVoltage,
      triggerVoltageChannel,
      isTriggerActive,
    } = this.state;
    isConnected &&
      loadBalancer.send(ipcRenderer, 'linker', {
        command: 'SET_CONFIG_OSC',
        timeGap: timeBase,
        numberOfSamples: 1000,
        ch1: activeChannels.ch1,
        ch2: activeChannels.ch2,
        ch3: activeChannels.ch3,
        ch4: activeChannels.ch4,
        triggerVoltage,
        isTriggerActive,
        triggerVoltageChannel,
      });
  }, 500);

  onToggleRead = event => {
    const { isReading } = this.state;
    this.setState(prevState => ({
      isReading: !prevState.isReading,
    }));
    if (isReading) {
      loadBalancer.send(ipcRenderer, 'linker', {
        command: 'STOP_OSC',
      });
    } else {
      loadBalancer.send(ipcRenderer, 'linker', {
        command: 'START_OSC',
      });
    }
  };

  onToggleChannel = channelName => event => {
    this.setState(
      prevState => ({
        activeChannels: {
          ...prevState.activeChannels,
          [channelName]: !prevState.activeChannels[channelName],
        },
      }),
      () => {
        this.sendConfigToDevice();
      },
    );
  };

  onChangeChannelRange = channelName => event => {
    this.setState(prevState => ({
      channelRanges: {
        ...prevState.channelRanges,
        [channelName]: event.target.value,
      },
    }));
  };

  onChangeChannelMap = channelName => event => {
    this.setState(prevState => ({
      channelMaps: {
        ...prevState.channelMaps,
        [channelName]: event.target.value,
      },
    }));
  };

  onToggleCheckBox = type => event => {
    this.setState(
      prevState => ({
        [type]: !prevState[type],
      }),
      () => {
        this.sendConfigToDevice();
      },
    );
  };

  onChangeTriggerVoltage = (event, value) => {
    this.setState(
      prevState => ({
        triggerVoltage: value,
      }),
      () => {
        this.sendConfigToDevice();
      },
    );
  };
  onChangeTriggerChannel = event => {
    this.setState(
      prevState => ({
        triggerVoltageChannel: event.target.value,
      }),
      () => {
        this.sendConfigToDevice();
      },
    );
  };
  onChangeTimeBase = (event, value) => {
    this.setState(
      prevState => ({
        timeBase: value,
      }),
      () => {
        this.sendConfigToDevice();
      },
    );
  };

  onChangeTransformType = event => {
    this.setState(prevState => ({
      transformType: event.target.value,
    }));
  };
  onChangeTransformChannel = channelNumber => event => {
    this.setState(prevState => ({
      [channelNumber]: event.target.value,
    }));
  };

  onChangePlotChannel = channelNumber => event => {
    this.setState(prevState => ({
      [channelNumber]: event.target.value,
    }));
  };

  render() {
    const {
      data,
      isReading,
      activeChannels,
      channelRanges,
      channelMaps,
      mapToMic,
      triggerVoltage,
      timeBase,
      triggerVoltageChannel,
      isTriggerActive,
      isFourierTransformActive,
      transformType,
      transformChannel1,
      transformChannel2,
      isXYPlotActive,
      plotChannel1,
      plotChannel2,
    } = this.state;
    const { isConnected } = this.props;
    return (
      <GraphPanelLayout
        settings={
          <Settings
            mapToMic={mapToMic}
            onToggleCheckBox={this.onToggleCheckBox}
            onToggleChannel={this.onToggleChannel}
            onChangeChannelRange={this.onChangeChannelRange}
            onChangeChannelMap={this.onChangeChannelMap}
            channelRanges={channelRanges}
            activeChannels={activeChannels}
            channelMaps={channelMaps}
            triggerVoltage={triggerVoltage}
            onChangeTriggerVoltage={this.onChangeTriggerVoltage}
            timeBase={timeBase}
            onChangeTimeBase={this.onChangeTimeBase}
            triggerVoltageChannel={triggerVoltageChannel}
            onChangeTriggerChannel={this.onChangeTriggerChannel}
            isTriggerActive={isTriggerActive}
            isFourierTransformActive={isFourierTransformActive}
            transformType={transformType}
            transformChannel1={transformChannel1}
            transformChannel2={transformChannel2}
            onChangeTransformType={this.onChangeTransformType}
            onChangeTransformChannel={this.onChangeTransformChannel}
            isXYPlotActive={isXYPlotActive}
            plotChannel1={plotChannel1}
            plotChannel2={plotChannel2}
            onChangePlotChannel={this.onChangePlotChannel}
          />
        }
        actionButtons={
          <ActionButtons
            isConnected={isConnected}
            isReading={isReading}
            onToggleRead={this.onToggleRead}
          />
        }
        graph={<Graph data={data} activeChannels={activeChannels} />}
      />
    );
  }
}

export default Oscilloscope;
