# 1. 네트워크 프로토콜
**프로토콜**이란 데이터를 원활히 주고받을 수 있도록 정한 약속이다. 같은 통신 프로토콜을 지원하는 장비간에만 통신이 가능하다. <br>
표준 통신 프로토콜에는 HTTP, TCP/IP 등이 있다.

### OSI 계층별 역할
- 물리계층: 전송매체를 통하여 비트 전송 <br>
- 데이터 링크 계층: 프레임을 노드 사이에 신뢰성 있게 전송 <br>
- 네트워크 계층: 패킷을 목적 host까지 전달하는 교환 기능 <br>
- 전송계층: 
  - 네트워크 계층을 이용하여 종점 호스트 사이에서 데이터 송수신
  - 종점(end point)간 연결관리, 오류제어, 흐름제어

### TCP/IP 계층
- 네트워크 액세스 계층:
  - 서브 네트워크에서 MAC 주소를 이용하여 프레임 단위로 실제 송수신하는 프로토콜 
  - MAC 주소: 네트워크 인터페이스(유무선 랜카드)에 할당된 48비트 크기의 H/W 고유주소
  - 이더넷, 와이파이 등
- 인터넷 계층:
  - 인터넷 프로토콜: IP 주소에 명시된 목적지까지 패킷을 전달. 라우팅 수행
  - IP 주소: 인터넷에서 host를 식별하는 주소(IPv4 32bit, IPv6 128bit 등)
  - ICMP, ARP(IP 주소를 MAC 주소로), RARP(MAC → IP), IGMP	
<br><br>

### 데이터 단위와 주소체계
1) 필드: 헤더나 트레일러에 담긴 세부 정보 단위
2) SDU(Service Data Unit): 상위 계층에서 온 순수한 데이터 알맹이
3) PDU(Protocol Data Unit): SDU + 헤더/트레일러 (물리: 비트, 링크: 프레임, 네트워크: 패킷, 전송: 세그먼트/데이터그램)
4) IP 주소: 인터넷상 호스트 식별 (IPv4 32bit, IPv6 128bit).
5) 포트(Port)번호
   - 포트(Port): 16비트 숫자로, 특정 소켓(접속점)을 구분. 같은 번호를 TCP/UDP가 써도 무방
   - 문자열 $\leftrightarrow$ 숫자 변환: 우리는 보통 "127.0.0.1"처럼 글자로 IP를 쓰지만, 컴퓨터는 32비트 숫자로 이해함. inet_addr() 같은 함수로 바꿔주는 과정이 필수
<br><br>

### 바이트 정렬
컴퓨터마다 숫자를 메모리에 저장하는 방식이 달라서 생기는 문제이다.

1) 호스트 바이트 순서: 컴퓨터가 내부 메모리에 정수를 저장하는 순서로 CPU 아키텍처에 따라 다름.
   - 참고: (80x86: little-endian | MC68000: big-endian | ARM: little-endian / big-endian)
   - Little-endian: 하위 바이트를 먼저 저장 (80x86, ARM 등).
   - Big-endian: 상위 바이트를 먼저 저장 (MC68000, ARM 등).
2) 네트워크 바이트 순서: port 번호나 IP주소와 같은 정보를 바이트 단위로 전송하는 순서. 무조건 **High-order(Big-endian)**로 전송.
3) 변환 함수:
   - htons() / ntohs() : host to network 바이트 변환. Unsigned short Integer(2바이트, Port 번호용).
   - htonl() / ntohl() : network to host 바이트 변환. Unsigned long Integer(4바이트, IP 주소용).

기타: IP 주소(4바이트)를 점진적 10진수(dotted decimal)로 바꾸는 함수들.
<br><br>

### 바이트 순서
   - Host Order: 내 컴퓨터 저장 방식 (Intel 계열은 보통 Little-endian).
   - Network Order: 전 세계 공통 약속 (Big-endian).
   - 변환 함수: htons, ntohs (2바이트/포트용), htonl, ntohl (4바이트/IP용).

서브 네트워크: 이더넷, 패킷, 교환망 등 실제 데이터를 실제로 전달해주는 네트워크
<br><br>