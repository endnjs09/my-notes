# 비동기형 채팅 프로그램
Selecting(셀렉팅)을 이용하여 채팅 서버 프로그램을 만들어보자. 채팅 서버에서는 하나의 프로세스가 채팅 참가 요청 접수와 여러 클라이언트와의 통신을 동시에 처리하며, select() 시스템 콜을 사용하여 소켓을 비동기 모드로 설정함.

### 프로그램 구조
![Image](/img/chat.png)
<br><br>


**fd_set 매크로들**
|종류|설명|
|--------------------|---|
|FD_ZERO(fd_set *set)|감시할 리스트를 통째로 비움. <br> fd_set의 모든 비트를 0으로 초기화 (select() 하기 전 선행)
|FD_SET(int fd, fd_set *set)|특정 소켓(fd)을 감시 리스트에 추가. <br>해당 fd번호에 대응하는 비트 칸을 1로 바꿈
|FD_CLR(int fd, fd_set *set)|감시 리스트에서 특정 소켓을 제거. <br> 해당 fd 번호의 비트 칸을 0으로 바꿈.
|FD_ISSET(int fd, fd_set *set)|특정 소켓에 이벤트가 터졌는지 확인. <br>select()가 끝난 후 해당 비트 칸이 여전히 1인지 검사.  

<br><br>

### 1. 서버
```C
#include "netprog2.h"
#define MAXLINE 511
#define MAX_SOCK 1024

char *EXIT_STRING = "exit";
char *START_STRING = "Connected to chat_server \n";

int maxfdp1;                  // select()가 감시할 최대 파일 디스크립터 번호 + 1    
int num_chat = 0;             // 현재 채팅 중인 클라이언트 수
int clisock_list[MAX_SOCK];   // 클라이언트 소켓 번호들을 모아둔 바구니
int listen_sock;              // 새로운 손님을 맞이하는 메인 소켓

// 함수 프로토타입 수정
void addClient(int s, struct sockaddr_in *newcliaddr);
int getmax();
void removeClient(int s); 
int tcp_listen(int host, int port, int backlog);

int main(int argc, char *argv[]) {
    struct sockaddr_in cliaddr;
    char buf[MAXLINE + 1];
    int i, j, nbyte, accp_sock, addrlen = sizeof(struct sockaddr_in);
    fd_set read_fds;
    
    if(argc != 2) {
        printf("사용법: %s port\n", argv[0]);
        exit(0);
    }
    
    listen_sock = tcp_listen(INADDR_ANY, atoi(argv[1]), 5);
    
    while(1) {
        FD_ZERO(&read_fds);     // 매 루프마다 감시할 리스트(read_fds)를 초기화
        FD_SET(listen_sock, &read_fds);   // listen_sock을 감시 대상에 넣기

        for (i = 0; i < num_chat; i++)    // 채팅에 참여중인 클라이언트 감시 대상에 넣기
            FD_SET(clisock_list[i], &read_fds);    
        
        maxfdp1 = getmax() + 1;     // 감시할 범위 설정 (가장 큰 번호 + 1)
        puts("wait for client");
        
        // 이벤트(사건)이 발생 될 때까지 대기 (select는 블로킹 함수)
        if (select(maxfdp1, &read_fds, NULL, NULL, NULL) < 0)   
            errquit("select fail");
        
        // [Event A] 새로운 연결 요청
        if (FD_ISSET(listen_sock, &read_fds)) {
            accp_sock = accept(listen_sock, (struct sockaddr *)&cliaddr, &addrlen);

            if (accp_sock == -1)
                errquit("accept fail");
                
            addClient(accp_sock, &cliaddr);  // 바구니(clisock_list)에 추가
            send(accp_sock, START_STRING, strlen(START_STRING), 0);  // 환영 인사
            printf("%d번째 사용자 추가.\n", num_chat);  
        }
        
        // [Event B] 클라이언트 메시지 처리
        for (i = 0; i < num_chat; i++) {
            if (FD_ISSET(clisock_list[i], &read_fds)) {
                // i 번째 클라이언트가 보낸 바이트(메시지)
                nbyte = recv(clisock_list[i], buf, MAXLINE, 0);  
                
                // 데이터가 0이면 클라이언트가 나갔다는 뜻 (연결 종료)
                if (nbyte <= 0) {  
                    removeClient(i);    // 바구니에서 빼고 소켓 닫기
                    continue;
                }

				buf[nbyte] = 0;
                // exit 문구 쳐도 퇴장 처리
                if (strstr(buf, EXIT_STRING) != NULL) { 
					removeClient(i);
                    continue;
				}

                buf[nbyte] = 0;
                // 받은 메시지를 나를 포함한 모든 참가자에게 뿌리기
                for (j = 0; j < num_chat; j++) 
                    send(clisock_list[j], buf, nbyte, 0);
                
                printf("%s\n", buf);
            }
        }    
    }
    return 0;
}

// 클라이언트 추가 함수
void addClient(int s, struct sockaddr_in *newcliaddr) { 
    char buf[20];
    inet_ntop(AF_INET, &newcliaddr->sin_addr, buf, sizeof(buf));
    printf("new client: %s\n", buf);
    
    clisock_list[num_chat] = s;
    num_chat++;
}

// 탈퇴 처리 함수
void removeClient(int s) {
    close(clisock_list[s]);
    if (s != num_chat - 1) 
        clisock_list[s] = clisock_list[num_chat - 1];
    num_chat--;
    printf("채팅 참가자 1명 탈퇴. 현재 참가자 수 = %d\n", num_chat);    
}

int getmax() {
    int max = listen_sock;
	int i;
    for (i = 0; i < num_chat; i++) {
        if (clisock_list[i] > max)
            max = clisock_list[i];
    }
    return max;
}

// listen 소켓 생성
int tcp_listen(int host, int port, int backlog) {
	int sd;
	struct sockaddr_in servaddr;

	sd = socket(AF_INET, SOCK_STREAM, 0);
	
	if (sd == -1) 
		errquit("socket fail");
	
	bzero((char *)&servaddr, sizeof(servaddr));
	
	servaddr.sin_family = AF_INET;
	servaddr.sin_addr.s_addr = htonl(host);
	servaddr.sin_port = htons(port);
	
	if (bind(sd, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0)
		errquit("bind fail");
	listen(sd, backlog);
	return sd;
}
```
<br><br><br>


### 2. 클라이언트
```C
#include "netprog2.h"
#define MAXLINE 1000
#define NAME_LEN 20

char *EXIT_STRING = "exit";

int tcp_connect(int af, const char *servip, unsigned short port);

int main(int argc, char *argv[]) {
	// bufall: [이름] + 메시지를 위한 버퍼
    // bufmsg: bufall 내부에서 메시지가 시작되는 지점을 가리킬 포인터
    char bufall[MAXLINE + NAME_LEN], *bufmsg;
	
    int maxfdp1, s, namelen;                  
    fd_set read_fds; // 감시할 리스트

    if (argc != 4) {
        printf("사용법 : %s sever_ip port name \n", argv[0]);
        exit(0);
    }

    // 버퍼 기법: bufall 앞부분에 "[이름] : "을 미리 적어둠.
    sprintf(bufall, "[%s] :", argv[3]); 
    namelen = strlen(bufall);       // 이름 부분의 길이 계산
    bufmsg = bufall + namelen;      // 메시지 시작 부분 지정

    // 서버에 접속 (1대1 통로 개설)
    s = tcp_connect(AF_INET, argv[1], atoi(argv[2]));
    if (s == -1)
        errquit("tcp_connect fail");

    puts("서버에 접속되었습니다.");
    maxfdp1 = s + 1;    // 감시 범위 설정 (소켓 번호 s가 가장 크니까)
    FD_ZERO(&read_fds);

    while (1) {
        FD_SET(0, &read_fds);	// 0번(stdout, 키보드) 감시 추가
        FD_SET(s, &read_fds);	// s번(서버 소켓) 감시 추가

        // 키보드를 치거나, 서버에서 말이 오거나 할 때까지 대기
        if (select(maxfdp1, &read_fds, NULL, NULL, NULL) < 0)
            errquit("select fail");

        // [Case A] 서버에서 메시지가 옮
        if (FD_ISSET(s, &read_fds)) {
            int nbyte;
            if ((nbyte = recv(s, bufmsg, MAXLINE, 0)) > 0) {
                bufmsg[nbyte] = 0;
                printf("%s \n", bufmsg);
            }
        }

        // [Case B] 사용자가 키보드를 침
        if (FD_ISSET(0, &read_fds)) {
            // 키보드 입력을 bufmsg 위치(이름 뒤)에 바로 입력 받음
            if (fgets(bufmsg, MAXLINE, stdin)) {

                // 전송할 때는 bufall을 통째로
                if (send(s, bufall, namelen + strlen(bufmsg), 0) < 0)
                    puts("Error : Write error on socket.");

                // exit 입력시 종료
                if (strstr(bufmsg, EXIT_STRING) != NULL) {
                    puts("Good bye.");
                    close(s);
                    exit(0);
                }
            }
        }
    } // end of while
}

// connect 함수
int tcp_connect(int af, const char *servip, unsigned short port) {
	struct sockaddr_in servaddr;
	int  s;

	if ((s = socket(af, SOCK_STREAM, 0)) < 0) 
		return -1;

	bzero((char*)&servaddr, sizeof(servaddr));
	servaddr.sin_family = af;
	inet_pton(AF_INET, servip, &servaddr.sin_addr);
	servaddr.sin_port = htons(port);

	if (connect(s, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0)
		return -1;
	return s;
}
```

<br><br>

### 참고 1 (recv & send 함수)
```C
ssize_t recv(int sockfd, void *buf, size_t len, int flags);
```
- **sockfd**: 말을 걸어온 클라이언트의 소켓 번호 (clisock_list[i])
- **buf**: 받은 내용을 담을 바구니
- **len**: 버퍼에 담을 수 있는 최대 크기 (MAXLINE)
- **flags**: 옵션 (0)
  
성공 시 전송된 바이트 수, 실패 시 -1 반환
<br><br>

```C
ssize_t send(int sockfd, const void *buf, size_t len, int flags);
```
- **sockfd**: 메시지를 받을 사람의 소켓 번호 (clisock_list[j])
- **buf**: 보낼 내용이 담길 바구니 (buf)
- **len**: 보낼 내용의 실제 길이 (nbyte)
- **flags**: 옵션 (0)

성공 시 받은 바이트 수(데이터 있을 때) or 0(연결 종료), 실패 시 -1 반환

