var NavEvent = NavEvent || {
    /*
     *�汾��Ϣ
     */
    REVISION: '0.0.6.0-2016-12.21',
    /*
     *Websocket ���ӿͻ���
     */
    Ros:null,
    /*
     *cmdTopic ���͵�Msg
     */
    CmdEnum: {
        Navigation: "navigation",
        Gmapping: "gmapping",
        Cancel: "cancel",
        Coverting: "converting",
        GamppingPose: "gmapping_pose",
        SaveMap: "save_map",
        SaveMapEdit: "save_map_edit",
        SaveAsMap: "save_as_map",
        SaveAsMapEdit: "save_as_map_edit",
        LoadMap: "load_map",
        LoadMapEdit: "load_map_edit",
        Userauth: "user_auth",
        Map_Select: "dbparam-select",  //��ѯ��ͼ
        Map_Delete: "dbparam-delete",  //ɾ����ͼ
        Map_Update: "dbparam-update", // �л���ͼ
        Map_Insert: "dbparam-insert", // ��ӵ�ͼ
        Update: "update",
        Roslog_delete: "roslog-delete",
        Roslog_select: "roslog-select",
        Version: "version",
    },
    /*
     *shellTopic ���͵�Msg
     */
    ShellEnum: {
        ChargeUp: 'rostopic pub -1 /auto_charge std_msgs/Byte "1"',
        ChargeDown: 'rostopic pub -1 /auto_charge std_msgs/Byte "0"',
        Joystick: '_JOYSTICK=`rosnode list | grep teleop_joystic`; if [[ -n $_JOYSTICK ]]; then _FB="joy_on"; else _FB="joy_off"; fi; rostopic pub -1 /shell_feedback std_msgs/String $_FB',
        JoystickOn: 'roslaunch bringup teleop_joystick.launch',
        JoystickOff: 'rosnode kill /teleop_joystick',
        MapSaveStaus: 'roslaunch bringup map_edit_as_saver.launch; rostopic pub -1 /shell_feedback std_msgs/String "map_edit_ok"',
        PLCopen: "rostopic pub -1 /waypoint_user_pub std_msgs/String \"wangjin_open\"",
        PLCclose: "rostopic pub -1 /waypoint_user_pub std_msgs/String \"wangjin_close\"",
        PLCstatus: "rostopic pub -1 /waypoint_user_pub std_msgs/String \"wangjin_status\"",
        Version: "_RC=`grep \'\\\'\'|\'\\\'\' ~/catkin_ws/README.md`;_FB=`echo $_RC | awk -F \'\\\'\'|\'\\\'\' \'\\\'\'{print $10}\'\\\'\'`;_FB=`echo version:$_FB | awk -F \'\\\'\' \'\\\'\' \'\\\'\'{print $1$2}\'\\\'\'`;rostopic pub -1 /shell_feedback std_msgs/String $_FB;unset _FB; unset _RC;",
    },
    /*
     *Topic ����
     */
    TopicEnum: {
        cmdTopic: { name: '/cmd_string', messageType: "std_msgs/String" },
        shellTopic: { name: '/shell_string', messageType: "std_msgs/String" },
        updateTopic: { name: '/system_shell/shell_string', messageType: "std_msgs/String" },
        imuTopic: { name: '/mobile_imu', messageType: "sensor_msgs/Imu" },
        velTopic: { name: '/cmd_vel', messageType: "geometry_msgs/Twist" },
        odomTopic: { name: '/odom', messageType: "nav_msgs/Odometry" },
        poseTopic: { name: '/robot_pose', messageType: "geometry_msgs/Pose" },
        diagnosticsTopic: { name: '/diagnostics_agg', messageType: "diagnostic_msgs/DiagnosticArray" },
        map_editTopic: { name: '/map_edit', messageType: "nav_msgs/OccupancyGrid" },
        map_edit_asTopic: { name: '/map_edit_as', messageType: "nav_msgs/OccupancyGrid" },
        waypointTopic: { name: '/waypoints', messageType: "yocs_msgs/WaypointList" },
        trajectoryTopic: { name: '/trajectories', messageType: "yocs_msgs/TrajectoryList" },
        waypoint_addTopic: { name: '/waypoint_add', messageType: "yocs_msgs/Waypoint" },
        waypoint_removeTopic: { name: '/waypoint_remove', messageType: "yocs_msgs/Waypoint" },
        trajectory_addTopic: { name: '/trajectory_add', messageType: "yocs_msgs/Trajectory" },
        trajectory_removeTopic: { name: '/trajectory_remove', messageType: "yocs_msgs/Trajectory" },
        nav_ctrlTopic: { name: '/nav_ctrl', messageType: "yocs_msgs/NavigationControl" },
        nav_ctrl_statusTopic: { name: '/nav_ctrl_status', messageType: "yocs_msgs/NavigationControlStatus" },
        shell_feedbackTopic: { name: '/shell_feedback', messageType: "std_msgs/String" },
    },

    /*
     * NavigationMode
     */
    NavigationModeEnum: {
        Navigation: "navigation",
        Gmapping: "gmapping",
        Coverting: "converting"
    },
    /*
     * ·���б�
     */
    WaypointList: new Array(),
    /*
     *�켣�б�
     */
    TrajectoryList: new Array(),
    /*
     *��ǰ����״̬ {string } ����/��ͼ/�л� NavigationModeEnum
     */
    NavigationMode: null,
    /*
     *��ǰWaypoint/Trajectory�ı������
     */
    CurrentPositionName: "",
    /*
     *�ֶ����ƶ�ʱ��
     */
    Timer: null,
    /*
     *��
     */
    actionClient: function () {
        return new ROSLIB.ActionClient({
            ros: this.Ros,
            actionName: 'move_base_msgs/MoveBaseAction',
            serverName: '/move_base'
        });
    },
    /*
     *����Msg
     *@data {string} CmdEnum/ShellEnum��ֵ
     */
    Msg: function (data) {
        return new ROSLIB.Message({
            data: data
        });
    },
    /*
     *��ͼ��Ϣ
     *@info {object} ��ͼͷ��Ϣ ����������
     *@data {Array}  ��ͼ������ֵ
     */
    MapMessage: function (info, data) {
        return new ROSLIB.Message({
            header: {
                frame_id: "/map",
                seq: 0
            },
            info: info,
            data: data
        });
    },
    /*
     *�����������Ϣ
     *@posX {number}  ����ԭ���ˮƽ����  
     *@posY {number}  ����ԭ��Ĵ�ֱ����
     *@oriZ {number}  �Ƕ�
     *@oriW {number}  �Ƕ�
     */
    Pose: function (posX, posY, oriZ, oriW) {
        return new ROSLIB.Pose({
            position: { x: posX, y: posY, z: 0.0 },
            orientation: { x: 0.0, y: 0.0, z: oriZ, w: oriW }
        })
    },
    /*
     *Ŀ��������
     *@pose {object} Ŀ�������  
     */
    Goal: function (pose) {
        return new ROSLIB.Goal({
            actionClient: this.actionClient(),
            goalMessage: {
                target_pose: {
                    header: {
                        frame_id: '/map'
                    },
                    pose: pose
                }
            }
        });
    },
    /*
     *����Waypoints��Ϣ
     *@name         {string} waypoint �����  
     *@pose         {object} ����� 
     *@radius       {number} �뾶 
     *@timeout      {number} ��ʱʱ�� ��λ MS 
     *@keep         {string} δ����������Ŀ������ LOOP ��һ�γ��� NONE ���ٳ���
     *@mode         {string} �ο�WaypointMode˵�� 
     */
    WaypointMessage: function (name, pose, radius, timeout, keep, mode) {
        return new ROSLIB.Message({
            header: {
                frame_id: mode,
            },
            close_enough: radius,
            goal_timeout: timeout,
            failure_mode: keep,
            name: name,
            pose: pose,
        });
    },
    /*
     *����Trajectory��Ϣ
     *@name         {string} trajectory �����  
     *@waypoints    {Array} waypoint���� 
     */
    TrajectoryMessage: function (name, waypoints) {
        return new ROSLIB.Message({
            name: name,
            waypoints: waypoints
        });
    },
    /*
     *����Waypoint��Trajectory�Ŀ�����Ϣ
     *@control      {number} 1:���� 2:ֹͣ
     *@goal_name    {string} ��Ҫִ�е�waypoint/trajectory�����
   */
    NavCtrlMessage: function (control, goal_name) {
        return new ROSLIB.Message({
            control: control,
            goal_name: goal_name
        });
    },
    /*
     *�����ٶ���Ϣ
     *@linear_x      {number} ���ٶ�
     *@angular_z     {number} ���ٶ�
     */
    TwistMessage: function (linear_x, angular_z) {
        return new ROSLIB.Message({
            linear: {
                x: linear_x,
                y: 0,
                z: 0
            },
            angular: {
                x: 0,
                y: 0,
                z: angular_z
            },
        });
    },
    /*
     *Websocket��ʼ��
     *@option      {object} option.url:��������ַ option.onopen:���ӳɹ��ص� option.onclose:���ӹرջص� option.onerror:���Ӵ���ص�
     */
    Init: function (option) {
        var url = option.url || "ws://" + window.location.hostname + ":9090";
        this.Ros = new ROSLIB.Ros();
        this.Ros.connect(url);
        this.Ros.on('connection', option.onopen || function () {
            console.log("connect server %s success", url);
        });
        this.Ros.on('close', option.onclose || function () {
            console.error("connect server %s close", url);
        });
        this.Ros.on('error', option.onerror || function () {
            console.error("connect server %s error", url);
        });
    },
    /*
     *����Topic
     *@option   {object} TopicEnum��ֵ
     */
    Topic: function (option) {
        return new ROSLIB.Topic({
            ros: this.Ros,
            name: option.name,
            messageType: option.messageType
        });
    },
    /*
     *��ʾ��ͼ
     *@width  {number}  �������
     *@height {number}  �����߶�
     *@div    {string}  ����������ID
     */
    ShowMap: function (width, height, div) {
        var viewer = new ROS2D.Viewer({
            divID: div,
            width: width,
            height: height,
            background: "url('images/bg1.jpg')"
        });
        var nav = NAV2D.OccupancyGridClientNav({
            ros: this.Ros,
            rootObject: viewer.scene,
            continuous: true,
            withOrientation: true,
            viewer: viewer,
            serverName: '/move_base'
        });
        return viewer.scene;
    },
    /*
     *�Ƴ���ͼ
     *@div    {string}  ����������ID
     */
    RemoveMap: function (div) {
        $("#" + div + " canvas").remove();
    },
    /*
     *�л�����ͼģʽ
     */
    Gmapping: function () {
        this.Publish(this.TopicEnum.cmdTopic, this.CmdEnum.Gmapping);
    },
    /*
     *�л�������ģʽ
     */
    Navigation: function () {
        this.Publish(this.TopicEnum.cmdTopic, this.CmdEnum.Navigation);
    },
    /*
     *���潨�õĵ�ͼ
     */
    SaveMap: function () {
        this.Publish(this.TopicEnum.cmdTopic, this.CmdEnum.GamppingPose, this.CmdEnum.SaveMap);
    },
    /*
     *�����޸ĺ�ĵ�ͼ
     *@info {object} ��ͼͷ��Ϣ
     *@data {Array}  ��ͼ�����ص�ֵ
     */
    SaveMapEdit: function (info, data) {
        this.Publish(this.TopicEnum.cmdTopic, this.CmdEnum.SaveAsMapEdit);

        var msg = this.MapMessage(info, data);
        var mapeditastopic = this.Topic(this.TopicEnum.map_edit_asTopic);
        mapeditastopic.publish(msg);
    },
    /*
     *ȡ����ǰ����ָ��
     */
    Cancel: function () {
        this.Publish(this.TopicEnum.cmdTopic, this.CmdEnum.Cancel);
    },
    /*
     *�ر��ֱ�
     */
    CloseHandle: function () {
        this.Publish(this.TopicEnum.shellTopic, this.ShellEnum.JoystickOff, this.ShellEnum.Joystick);
    },
    /*
     *�����ֱ�
     */
    OpenHandle: function () {
        this.Publish(this.TopicEnum.shellTopic, this.ShellEnum.JoystickOn, this.ShellEnum.Joystick);
    },

    /*
     *վ�����
     *@wapoint {object} վ����Ϣ WaypointMessage
     */
    WayPointAdd: function (waypoint) {
        var topic = this.Topic(this.TopicEnum.waypoint_addTopic);
        topic.publish(waypoint);
    },
    /*
     *վ��ɾ��
     *@wapoint {object} վ����Ϣ WaypointMessage
     */
    WayPointRemove: function (waypoint) {
        var topic = this.Topic(this.TopicEnum.waypoint_removeTopic);
        topic.publish(waypoint);
    },
    /*
     *�켣���
     *@trajectory {object} վ����Ϣ TrajectoryMessage
     */
    TrajectoryAdd: function (trajectory) {
        var topic = this.Topic(this.TopicEnum.trajectory_addTopic);
        topic.publish(waypoint);
    },

    /*
     *�켣ɾ��
     *@trajectory {object} վ����Ϣ TrajectoryMessage
    */
    TrajectoryAdd: function (trajectory) {
        var topic = this.Topic(this.TopicEnum.trajectory_removeTopic);
        topic.publish(waypoint);
    },
    /*
     * �����˶� ������ָ���ص�
     * @pose            {Pose}      �����
     * @goalCallback    {Fuction}           
     * @returns  void 
     */
    goPostion: function (pose, goalCallback) {
        var goal = this.Goal(pose);
        goal.send();
        goal.on('status', goalCallback);
    },
    /*
     *ǰ��
     */
    goFront: function () {
        var velTopic = this.Topic(this.TopicEnum.velTopic);
        if (this.Timer != null) {
            clearInterval(this.Timer);
            this.Timer = null;
        }
        this.Timer = setInterval(function () {
            velTopic.publish(this.TwistMessage(0.25, 0));
        }, 300);
    },
    /*
     *����
     */
    goBack: function () {
        var velTopic = this.Topic(this.TopicEnum.velTopic);
        if (this.Timer != null) {
            clearInterval(this.Timer);
            this.Timer = null;
        }
        this.Timer = setInterval(function () {
            velTopic.publish(this.TwistMessage(-0.25, 0));
        }, 300);
    },
    /*
     *��ת
     */
    goLeft: function () {
        var velTopic = this.Topic(this.TopicEnum.velTopic);
        if (this.Timer != null) {
            clearInterval(this.Timer);
            this.Timer = null;
        }
        this.Timer = setInterval(function () {
            velTopic.publish(this.TwistMessage(0, 0.25));
        }, 300);
    },
    /*
     *��ת
     */
    goRight: function () {
        var velTopic = this.Topic(this.TopicEnum.velTopic);
        if (this.Timer != null) {
            clearInterval(this.Timer);
            this.Timer = null;
        }
        this.Timer = setInterval(function () {
            velTopic.publish(this.TwistMessage(0, -0.25));
        }, 300);
    },
    /*
     *ֹͣ
     */
    goStop: function () {
        var velTopic = this.Topic(this.TopicEnum.velTopic);
        if (this.Timer != null) {
            clearInterval(this.Timer);
            this.Timer = null;
        }
        velTopic.publish(this.TwistMessage(0, 0));
    },
    /*
     *����Topic
     *@topic    {object}    TopicEnum����
     *@callback {function}  �ص�
     */
    Subscribe: function (topic, callback) {
        var topic = this.Topic(topic);
        topic.subscribe(callback);
    },
    /*
    *ȡ������Topic
    *@topic    {object}    TopicEnum����
    *@callback {function}  ���ĺ����ص�
    */
    Unsubscribe: function (topic, callback) {
        var topic = this.Topic(topic);
        if (arguments.length == 2 && typeof (callback) == "function") {
            topic.unsubscribe(callback);
        }
        else {
            topic.unsubscribe();
        }
    },
    /*
     *����Topic
     *@topic    {object}    TopicEnum����
     *@data     {string}    CmdEnum/ShellEnum����,֧�ֶ������
     */
    Publish: function (topic, data) {
        var topic = this.Topic(topic);
        for (var i = 1; i < arguments.length; i++) {
            var msg = this.Msg(arguments[i]);
            topic.publish(msg);
        }

    }
};


