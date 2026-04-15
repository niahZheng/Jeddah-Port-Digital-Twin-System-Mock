import { PassengerBoardingPanel } from './panels/PassengerBoardingPanel'

type Props = { activeNav: string }

export function PassengerDispatcherWorkspace(props: Props) {
  switch (props.activeNav) {
    case '客轮调度准备':
      return <PassengerBoardingPanel page="prep" />
    case '客流疏导调度':
      return <PassengerBoardingPanel page="flow" />
    case '旅客检票调度':
      return <PassengerBoardingPanel page="checkin" />
    case '客轮登船调度':
      return <PassengerBoardingPanel page="boarding" />
    case '业务异常处理':
      return <PassengerBoardingPanel page="exceptions" />
    case '客运服务管控':
      return <PassengerBoardingPanel page="service" />
    case '业务复盘':
      return <PassengerBoardingPanel page="review" />
    default:
      return (
        <div className="director-page">
          <p className="director-muted">未识别的导航：{props.activeNav}</p>
        </div>
      )
  }
}
