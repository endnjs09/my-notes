# 1. UDP 소켓 프로그램
### socket()
소켓을 초기화하는 함수. 
```C
int socket(int domain, int type, int protocol)
```
- **domain**: 프로토콜 체계 (PF_INET, AF_INET 등)
- **type**: 소켓의 형태, UDP(SOCK_DGRAM), TCP(SOCK_STREAM) 등
- **protocol**: 사용할 프로토콜 (IPPROTO_TCP, IPPROTO_UDP 등)

성공 시 소켓 디스크립터(양수), 실패시 -1을 반환 
```C
int s = socket(PF_INET, SOCK_DGRAM, 0);
if (s < 0) errquit("socket fail");

// PF_INET: IPv4 프로토콜
// SOCK_DGRAM: UDP 소켓
// 0: 자동으로 선택 (보통은 0)
```
<br>

### bind()
소켓에 IP와 포트를 할당하는 함수
```C
int bind(SOCKET sockfd, const sockaddr *addr, int addrlen)
```
- **sockfd**: 위에서 만든 소켓 번호(디스크립터)
- ***addr**: 주소 정보(ip, port 등)가 담긴 주소값 (형변환 필수)
- **addrlen**: 주소 구조체의 크기
  
성공 시 0, 실패시 -1을 반환 
```C
bind(s, (struct sockaddr*)&servaddr, sizeof(servaddr))

// s: 소켓 번호
// (struct sockaddr*)&servaddr: servaddr의 주소값
// sizeof(servaddr): servadder의 주소 크
```
<br>

### recvfrom() → 서버
데이터를 받고 보낸 사람 확인하는 함수
```C
ssize_t recvfrom(int sockfd, void *buf, size_t len, int flags, struct sockaddr *src_addr, socklen_t *addrlen);
```
- **sockfd**: 소켓 번호(디스크립터)
- ***buf**: 받은 데이터를 담을 버퍼(바구니)
- **len**: 버퍼의 최대 크기
- **flags**: 옵션 (보통은 0)
- ***src_addr**: 보낸 사람의 주소를 기록할 빈 구조체 주소
- ***addrlen**: 주소 구조체 크기가 저장된 변수의 주소값 (포인터)

성공시 받은 바이트 수를, 실패시 -1 반환
```C
int addrlen = sizeof(struct sockaddr);
nbyte = recvfrom(s, buf, MAXLINE, 0, (struct sockaddr*)&cliaddr, &addrlen)

// s: 소켓 번호
// buf: 데이터가 든 버퍼
// MAXLINE: 버퍼(바구니)의 최대 크기
// 0: 옵션
// (struct sockaddr*)&cliaddr: 누구한테 보낼지 적힌 주소
// &addrlen: 주소 크기를 알려주는 변수의 주소값 (길이를 서버가 직접 써넣어야 하므로 주소를 줌)
```
<br>

### sendto() → 클라이언트
특정 주소로 데이터를 던질 때 쓰는 함수
```C
ssize_t sendto(int sockfd, const void *buf, size_t len, int flags, 
                const struct sockaddr *dest_addr, socklen_t addrlen);
```
- **sockfd**: 소켓 번호(디스크립터)
- ***buf**: 보낼 데이터가 든 버퍼(바구니)
- **len**: 보낼 데이터의 실제 크기
- **flags**: 옵션
- ***dest_addr**: 받을 사람의 주소가 적혀있는 구조체 주소
- **addrlen**: 주소 구조체의 크기 (값 전달)

성공시 보낸 바이트 수를, 실패시 -1 반환
```C
sendto(s, buf, nbyte, 0, (struct sockaddr*)&cliaddr, addrlen);

// s: 소켓 번호
// buf: 데이터가 든 버퍼
// nbyte: 보낼 데이터의 실제 크기
// 0: 옵션
// (struct sockaddr*)&cliaddr: 누구한테 보낼지 적힌 주소
// addrlen: 주소 구조치의 크기 (값만 알려주면 되므로 일반 변수 사용)
```
<br>

### 바이트 오더 변환
```C
unsigned short htons(unsigned short hostshort);  // Host to Network Short
unsigned long  htonl(unsigned long  hostlong);   // Host to Network Long
unsigned short ntohs(unsigned short netshort);   // Network to Host Short
unsigned long  ntohl(unsigned long  netlong);    // Network to Host Long
```
- **h (Host)**: 내 컴퓨터의 숫자 방식 (대부분 Little-endian)
- **n (Network)**: 인터넷 공용 숫자 방식 (무조건 Big-endian)
- **s (Short)**: 2바이트 (포트 번호용)
- **l (Long)**: 4바이트 (IP 주소나 큰 숫자 데이터 )
```C
servaddr.sin_port = htons(9000);    // 보낼 때 (host → network)
long result = ntohl(res.result);    // 받을 때 (network → host)
```
<br><br><br>

# 2. TCP 소켓 프로그램
### listen() → 서버
서버가 클라이언트의 접속을 받을 준비가 되었음을 운영체제에 알리는 함수
```C
int listen(int sockfd, int backlog);
```
- **sockfd**: bind()까지 마친 서버의 소켓 번호
- **backlog**: 대기실 크기. 즉, 연결 요청이 한꺼번에 몰릴 때 accept()로 넘겨주기 전까지 줄을 세워둘 수 있는 최대 수

성공시 0, 실패시 -1 반환
```C
if (listen(listen_sock, 5) < 0) 
    errquit("listen fail");
```
<br>

### accept() → 서버
대기 중인 클라이언트의 요청을 받아 실제 통신용 소켓을 만드는 함수
```C
int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen);
```
- **sockfd**: 서버 소켓 번호
- ***addr**: 클라이언트 주소를 담아줄 구조체 주소
- ***addrlen**: addr 구조체 크기를 지정하고 실제 저장된 주소 크기를 반환하는 포인터

성공시 새로운 소켓 디스크립터, 실패시 -1 반환
```C
accp_sock = accept(listen_sock, (strcut sockaddr*)&cliaddr, &addrlen);
if (accp_sock < 0)
    errquit("accept fail");
```
<br>

### connect() → 클라이언트
서버에 전화를 거는 함수
```C
int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
```
- **sockfd**: 내 소켓 번호
- ***addr**: 연결할 서버 주소가 담긴 구조체 주소
- **addrlen**: 주소 구조체 크기
  
성공시 0 실패시 -1 반환
```C
if (connect(s, (struct sockaddr *)&servaddr, sizeof(servaddr)) < 0) 
    errquit("connect fail");

// 내 소켓 번호를 servaddr(서버 주소)에 connect 시도
```
<br>

### read() & write()
연결된 통로를 통해 데이터를 읽고 씀. 버퍼 형식
```C
ssize_t read(int fd, void *buf, size_t count);
ssize_t write(int fd, void *buf, size_t count);
```
- **fd**: 읽거나 쓸 파일(소켓) 디스크립터
- **void** *buf: 읽거나 쓸 데이터를 저장할 버퍼의 포인터
- **count**: 읽거나 쓸 데이터의 최대 바이트 수

성공시 실제로 읽거나 쓴 바이트 수, 실패시 -1 반환
```C
nbyte = read(accp_sock, buf, MAXLINE);
if (nbyte == 0) 
    printf("Connection closed\n");
```

### inet_aton()
문자열을 바이너리 주소로 변환하는 함수
```C
int inet_aton(const char *cp, struct in_addr *inp);
```
- ***cp**: 192.168.0.1과 같은 점 분리 10진수 문자열 포인터
- ***inp**: 변환된 바이너리 주소를 저장할 구조체 포인터

주소가 유효하면 0이 아닌 값, 유효하지 않으면 0을 반환
```C
if (inet_aton("127.0.0.1(argv[1])", &servaddr.sin_addr) == 0) 
    printf("Invalid address\n");
```
<br>

### inet_ntop()
바이너리 주소를 문자열로 변환하는 함수
```C
const char *inet_ntop(int af, const void *src, char *dst, socklen_t size);
```
- **af**: 주소 체계 (AF_INET or AF_INET6)
- ***src**: 변환할 바이너리 주소가 저장된 메모리 포인터
- ***dst**: 반환된 문자열이 저장될 버퍼 포인터
- **size**: dst 버퍼의 크기

성공시 결과 문자열이 저장된 dst의 포인터, 실패시 NULL
```C
if (inet_ntop(AF_INET, &cliaddr.sin_addr, IPaddr, sizeof(IPaddr)) == NULL) 
    printf("Error\n");
```
<br>

### getsockname()
내 소켓 정보를 확인하는 함수
```C
int getsockname(int sockfd, struct sockaddr *addr, socklen_t *addrlen);
```
- **sockfd**: 소켓의 파일 디스크립터
- ***addr**: 소켓 주소 정보가 저장될 구조체 포인터
- ***addrlen**: addr 구조체 크기를 지정하고 실제 저장된 주소 크기를 반환하는 포인터

성공시 0 실패시 -1 반환
```C
getsockname(s, (struct sockaddr *)&cliaddr, &addrlen);
```
